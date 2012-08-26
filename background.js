console.log("Flake initialized");

var offlineMode = false;
var blockNonHTTPS = false;
var extURL = chrome.extension.getURL("");

init();

function requestFilter(details) {
  var reqLog = "request [" + details.tabId + "][" + details.frameId + "][" +
    details.parentFrameId + "][" + details.type + "]: " + details.url;

  // Allow all requests destined to our own extension.
  if (details.url.indexOf(extURL) == 0) {
    return {cancel: false};
  }
  // If we are in offline mode, block all requests.
  if (offlineMode) {
    console.log("Blocking offline " + reqLog);
    return  {cancel: true};
  }

  var uri = parseUri(details.url);
  
  // Block non-https traffic.
  if (blockNonHTTPS) {
    if (uri.protocol == "chrome") {
      console.log("Allowing chrome scheme " + reqLog);
      return {cancel: false};
    }
    if (uri.protocol != "https") {
      console.log("Blocking non-https " + reqLog);
      return  {cancel: true};
    }
  }

  if (details.type === 'main_frame') {
    tabsData.resetTab(details.tabId);
  }

  if (details.type === 'script') {
    tabsData.addScripts(details.tabId, uri);
  }
  
  console.log("Allow " + reqLog);
  return {cancel: false};
}


function lockDownContentSettings() {
  chrome.contentSettings.javascript.set(
    { 'primaryPattern': "<all_urls>", 'setting': "block", 'scope': 'regular' },
    function () {
      if (chrome.extension.lastError === undefined)
        console.log("JavaScript disabled successfully.");
      else
        console.log("Failed to disable JavaScript!", chrome.extension.lastError);
    }
  );
  chrome.contentSettings.cookies.set(
    { 'primaryPattern': "<all_urls>", 'secondaryPattern': "<all_urls>", 
      'setting': "session_only", 'scope': "regular" },
    function () {
      if (chrome.extension.lastError === undefined)
        console.log("Cookie persistence disabled successfully.");
      else
        console.log("Failed to disable cookie persistence!", chrome.extension.lastError);
    }
  );
  chrome.contentSettings.plugins.set(
    { 'primaryPattern': "<all_urls>", 'setting': "block", 'scope': "regular" },
    function () {
      if (chrome.extension.lastError === undefined)
        console.log("Plugins disabled successfully.");
      else
        console.log("Failed to disable Plugins!", chrome.extension.lastError);
    }
  );
  chrome.contentSettings.popups.set(
    { 'primaryPattern': "<all_urls>", 'setting': "block", 'scope': "regular" },
    function () {
      if (chrome.extension.lastError === undefined)
        console.log("Popups disabled successfully.");
      else
        console.log("Failed to disable popups!", chrome.extension.lastError);
    }
  );
  chrome.contentSettings.notifications.set(
    { 'primaryPattern': "<all_urls>", 'setting': "block", 'scope': "regular" },
    function () {
      if (chrome.extension.lastError === undefined)
        console.log("Notifications disabled successfully.");
      else
        console.log("Failed to disable notifications!", chrome.extension.lastError);
    }
  );
}


function init() {
  // Install the web request filter as the first order of initialization
  chrome.webRequest.onBeforeRequest.addListener(
    requestFilter,
    {urls: ["<all_urls>"]},
    ["blocking"]
  );
 
  initTabs(); 
  lockDownContentSettings();
  chrome.extension.onRequest.addListener(msgListener);
}

var dispatchTable = new Array();

dispatchTable['getOfflineMode'] = function getOfflineMode(request, sendResponse) {
  console.log("Responding to getOfflineMode with " + offlineMode);
  sendResponse({offline: offlineMode});
};

dispatchTable['toggleOfflineMode'] = function(request, sendResponse) {
  offlineMode = !offlineMode;
  chrome.webRequest.handlerBehaviorChanged();
  console.log("Toggled offline mode to: " + offlineMode);
  sendResponse({offline: offlineMode});
};

dispatchTable['toggleHttps'] = function(request, sendResponse) {
  blockNonHTTPS = !blockNonHTTPS;
  chrome.webRequest.handlerBehaviorChanged();
  console.log("Toggled HTTPS only mode to: " + blockNonHTTPS);
  sendResponse({onlyHttps: blockNonHTTPS});
};

dispatchTable['getDomains'] = function getDomains(request, sendResponse) {
  var t = tabsData.tabs[request.tabId];
  var r = {scripts: t.scripts};
  sendResponse(r);
}

dispatchTable['getOptions'] = function(request, sendResponse) {
  var response = {offline: offlineMode, onlyHttps: blockNonHTTPS};
  sendResponse(response);
}

function msgListener(request, sender, sendResponse) {
  console.log(sender.tab ?
              "from content script:" + sender.tab.url :
              "from the extension");
  var f = dispatchTable[request.msg];
  if (f !== undefined) {
    f(request, sendResponse);
  }
}

function enableJS(domain) {
  chrome.contentSettings.javascript.set(
    { 'primaryPattern': domain, 'setting': 'allow', 'scope': 'regular' },
    function () {
      if (chrome.extension.lastError === undefined)
        console.log("JavaScript enabled successfully for: " + domain);
      else
        console.log("Failed to enable JavaScript for " + domain + " due to: ", chrome.extension.lastError);
    }
  );
}
