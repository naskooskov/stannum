function $(id) {
  return document.getElementById(id);
}

var settingsChanged = false;

function init() {
  window.width = 600;
  window.height = 600;
  chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
    chrome.extension.sendRequest({msg: 'getOrigins', tabId: tabs[0].id}, getOriginsResponse);
  });
}

function createScriptEntry(origin, data) {
  var d = document.createElement('div');
  d.id = origin;
  var p = document.createElement('h3');
  p.innerHTML = origin + ' | ' + data.setting;
  d.appendChild(p);

  return d;
}

function getOriginsResponse(data) {
  console.log('getOriginsResponse');
  var ds = new Array();

  var scripts = data.scripts;

  for (var origin in scripts) {
    if ($(origin) !== null)
      continue;
    var r = new ResourceEntry(origin, scripts[origin]);
    r.appendTo($('domains'));
  }
}

function ResourceEntry(origin, data) {
  this.origin = origin;
  this.data = data;

  this.appendTo = function(node) {
    var resource = document.createElement('div');
    var content = document.createElement('div');
    this.allowButton = document.createElement('button');
    this.blockButton = document.createElement('button');
    var label = document.createTextNode(origin);

    this.allowButton.innerText = 'Allow';
    this.allowButton.resource = this;
    this.allowButton.onclick = this.allowResource;
    this.blockButton.innerText = 'Block';
    this.blockButton.resource = this;
    this.blockButton.onclick = this.blockResource;

    this.updateState(this.data.setting);

    content.appendChild(label);
    content.appendChild(this.allowButton);
    content.appendChild(this.blockButton);

    resource.id = origin;
    resource.resource = this;
    resource.appendChild(content);

    node.appendChild(resource);
  }

  this.allowResource = function() {
    chrome.extension.sendRequest(
      {
        msg: 'allowResource', 
        origin: this.resource.origin,
      }, 
      updateResourceState
    );
  }
  this.blockResource = function() {
    chrome.extension.sendRequest(
      {
        msg: 'blockResource', 
        origin: this.resource.origin,
      }, 
      updateResourceState
    );
  }

  this.updateState = function(state) {
    if (state === 'allow') {
      this.allowButton.disabled = true;
      this.blockButton.disabled = false;
    } else if (state === 'block') {
      this.allowButton.disabled = false;
      this.blockButton.disabled = true;
    } else {
      console.log("updateState - unknown state: " + state);
    }
  }
}

function updateResourceState(msg) {
  var r = $(msg.origin);
  if (r != undefined && r.resource != undefined) {
    r.resource.updateState(msg.setting);
    settingsChanged = true;
  }
}

window.onunload = function() {
  console.log('popup closing');
  chrome.extension.sendRequest({msg: 'ping', 'data': 'Closing popup.html'});
}

document.addEventListener('DOMContentLoaded', init);
