function $(id) {
  return document.getElementById(id);
}

function init() {
  chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
    chrome.extension.sendRequest({msg: "getOrigins", tabId: tabs[0].id}, getOriginsResponse);
  });
}

function getOrigin(uri) {
  var origin = uri.protocol + "://" + uri.authority;
  if (uri.port) 
    origin += ":" + uri.port;
  return origin;
}

function createScriptEntry(origin, data) {
  var d = document.createElement("div");
  d.id = origin;
  var p = document.createElement("h3");
  p.innerHTML = origin + " | " + data.setting;
  d.appendChild(p);

  return d;
}

function getOriginsResponse(data) {
  console.log("getOriginsResponse");
  var ds = new Array();

  var scripts = data.scripts;

  for (var origin in scripts) {
    if ($(origin) !== null)
      continue;
    $('domains').appendChild(createScriptEntry(origin, scripts[origin]));
  }
}

document.addEventListener('DOMContentLoaded', init);
