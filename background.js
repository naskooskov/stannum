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
 
  lockDownContentSettings();
  chrome.extension.onRequest.addListener(msgListener);
  initConfig();
  initTabs();
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

dispatchTable['getOrigins'] = function getOrigins(request, sendResponse) {
  var t = tabsData.tabs[request.tabId];
  var scripts = {};
  for (var i = 0; i < t.scripts.length; ++i) {
    var origin = getOriginFromUri(t.scripts[i]);
    var config = configData.scripts[origin + '/*'];
    if (config === undefined) {
      scripts[origin] = {'setting': 'block'};
    } else {
      scripts[origin] = {'setting': config.setting};
    }
  }

  chrome.tabs.get(request.tabId, function(tab) {
    var tabOrigin = getOriginFromUri(parseUri(tab.url));
    getResource(tabOrigin, function(origin, value) {
      scripts[origin] = {'setting': value};
      var r = {'scripts': scripts};
      sendResponse(r);
    });
  });
}

dispatchTable['getOptions'] = function(request, sendResponse) {
  var response = {offline: offlineMode, onlyHttps: blockNonHTTPS};
  sendResponse(response);
}

dispatchTable['allowResource'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Allowing resource from: ' + origin);
  setResource(origin, 'allow', function(setting) { 
    sendResponse({'origin': origin, 'setting': setting}); });
}

dispatchTable['blockResource'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Blocking resource from: ' + origin);
  setResource(origin, 'block', function(setting) { 
    sendResponse({'origin': origin, 'setting': setting}); });
}

dispatchTable['ping'] = function(request, sendResponse) {
  console.log("ping: " + request.data);
}

function msgListener(request, sender, sendResponse) {
  console.log(sender.tab ?
              "msg |" + request.msg + "| from content script:" + sender.tab.url :
              "msg from the extension");
  var f = dispatchTable[request.msg];
  if (f !== undefined) {
    f(request, sendResponse);
  }
}

function getResource(origin, callback) {
  var pattern = origin + "/*";
  chrome.contentSettings.javascript.get(
    { 'primaryUrl': pattern },
    function (details) {
      if (chrome.extension.lastError === undefined) {
        console.log("Resource set to " + details.setting + " for " + pattern);
        if (callback !== undefined)
          callback(origin, details.setting);
      } else {
        console.log("Failed to get value for " + origin + " due to: ", chrome.extension.lastError);
      }
    }
  );
}

function setResource(origin, setting, callback) {
  var pattern = origin + "/*";
  chrome.contentSettings.javascript.set(
    { 'primaryPattern': pattern, 'setting': setting },
    function () {
      if (chrome.extension.lastError === undefined) {
        console.log("Resource set to " + setting + " successfully for: " + pattern);
        configData.addScriptOrigin(pattern, setting);
        if (callback !== undefined)
          callback(setting);
      } else {
        console.log("Failed to enable JavaScript for " + origin + " due to: ", chrome.extension.lastError);
      }
    }
  );
}

function enableJS(origin) {
  var pattern = origin + "/*";
  chrome.contentSettings.javascript.set(
    { 'primaryPattern': pattern, 'setting': 'allow', 'scope': 'regular' },
    function () {
      if (chrome.extension.lastError === undefined) {
        console.log("JavaScript enabled successfully for: " + pattern);
        configData.addScriptOrigin(pattern, 'allow');
      } else {
        console.log("Failed to enable JavaScript for " + origin + " due to: ", chrome.extension.lastError);
      }
    }
  );
}
