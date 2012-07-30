var incognito;
var url;

function $(id) {
  return document.getElementById(id);
}


function toggleOffline() {
  chrome.extension.sendRequest({msg: "toggleOfflineMode"}, function(response) {
    console.log("OfflineMode: " + response.offline);
    $('offlineMode').checked = response.offline;
  });
}

function init() {
  chrome.extension.sendRequest({msg: "getOfflineMode"}, function(response) {
    console.log("OfflineMode: " + response.offline);
    $('offlineMode').checked = response.offline;
  });
  
  chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
    chrome.extension.sendRequest({msg: "getDomains", tabId: tabs[0].id}, getDomainsResponse);
  });

  $('offlineMode').onclick = toggleOffline;
}

function getOrigin(uri) {
  var origin = uri.protocol + "://" + uri.authority;
  if (uri.port) 
    origin += ":" + uri.port;
  return origin;
}

function getDomainsResponse(domain) {
  console.log("getDomainsResponse");
  var ds = new Array();

  for (var i = 0; i < domain.scripts.length; ++i) {
    var origin = getOrigin(domain.scripts[i]);
    if ($(origin) == null) {
      var d = document.createElement("div");
      d.id = origin;
      var p = document.createElement("h2");
      p.innerHTML = origin;
      d.appendChild(p);
      $('domains').appendChild(d);
    }
    
    var s = document.createElement("div");
    s.innerHTML = domain.scripts[i].source;
    $(origin).appendChild(s);
  }
}

document.addEventListener('DOMContentLoaded', init);
