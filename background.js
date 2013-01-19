
// Initialize the namespace.
flake = window.flake || {};


/**
 * The URL of the Flake extension.
 * @type {string}
 */
flake.EXTENSION_URL = chrome.extension.getURL('');


/**
 * Specifies if Chrome is to be in offline mode.
 * @type {boolean}
 */
flake.offlineMode = false;


/**
 * Specifies if all outgoing requests should be over HTTPS.
 * @type {boolean}
 */
flake.alwaysHttpsMode = false;


/**
 * Specifies if all outgoing HTTP requests should be upgraded to HTTPS.
 * @type {boolean}
 */
flake.upgradeHttpMode = false;


/**
 * Initialize Flake.
 */
flake.init = function() {
  // Install the web request filter as the first order of initialization
  chrome.webRequest.onBeforeRequest.addListener(
    flake.handlers.requestFilter,
    {urls: ["<all_urls>"]},
    ["blocking"]
  );
 
  flake.lockDownContentSettings();
  flake.lockDownPrivacySettings();
  chrome.extension.onRequest.addListener(msgListener);
  // TODO(radi): Rename once config.js is refactored.
  initConfig();
  flake.initTabs();
};


/**
 * Enables/disables the offline mode in Chrome.
 * @return {boolean} True if offline mode is enabled.
 */
flake.toggleOffline = function() {
  flake.offlineMode = !flake.offlineMode;
  chrome.webRequest.handlerBehaviorChanged();

  return flake.offlineMode;
};


/**
 * Enables/disables the always HTTPS mode in Chrome.
 * @return {boolean} True if always HTTPS mode is enabled.
 */
flake.toggleAlwaysHttpsMode = function() {
  flake.alwaysHttpsMode = !flake.alwaysHttpsMode;
  chrome.webRequest.handlerBehaviorChanged();

  return flake.alwaysHttpsMode;
};


/**
 * Enables/disables the upgrade HTTP to HTTPS mode in Chrome.
 * @return {boolean} True if upgrade HTTP to HTTPS mode is enabled.
 */
flake.toggleUpgradeHttpMode = function() {
  flake.upgradeHttpMode = !flake.upgradeHttpMode;
  chrome.webRequest.handlerBehaviorChanged();

  return flake.upgradeHttpMode;
};


/**
 * Lock down the content settings.
 */
flake.lockDownContentSettings = function() {
  var defaultArgs = {
    primaryPattern: '<all_urls>',
    setting: 'block',
    scope: 'regular'
  };

  flake.setSetting_(
      chrome.contentSettings.javascript, defaultArgs, 'JavaScript');

  flake.setSetting_(chrome.contentSettings.cookies, function() {
    var args = JSON.parse(JSON.stringify(defaultArgs));
    args.secondaryPattern = '<all_urls>';
    args.setting = 'session_only';

    return args;
  }(), 'Cookie persistence');

  flake.setSetting_(chrome.contentSettings.plugins, defaultArgs, 'Plugins');
  flake.setSetting_(chrome.contentSettings.popups, defaultArgs, 'Popups');
  flake.setSetting_(
      chrome.contentSettings.notifications, defaultArgs, 'Notifications');
};


/**
 * Lock down the privacy settings.
 */
flake.lockDownPrivacySettings = function() {
  var args = {value: false};
  var settingsMap = {
    'Auto-fill': chrome.privacy.services.autofillEnabled,
    'Alternate error pages': chrome.privacy.services.alternateErrorPagesEnabled,
    'Instant': chrome.privacy.services.instantEnabled,
    'Safe-browsing': chrome.privacy.services.safeBrowsingEnabled,
    'Search suggest': chrome.privacy.services.searchSuggestEnabled,
    'Translation service': chrome.privacy.services.translationServiceEnabled,
    'Network prediction': chrome.privacy.network.networkPredictionEnabled,
    'Third-party cookies': chrome.privacy.websites.thirdPartyCookiesAllowed
  };

  for (settingName in settingsMap) {
    flake.setPrivacySetting_(settingsMap[settingName], args, settingName);
  }
};


/**
 * Set a given setting.
 * @param {!Object} setting The setting to lock down.
 * @param {!Object} settingArgs The required arguments to lock down the setting.
 * @param {string} settingName The name of the setting.
 * @param {function(...)=} opt_callback An optional callback to invoke once the
 *     setting is set.
 * @private
 */
flake.setSetting_ = function(setting, settingArgs, settingName, opt_callback) {
  setting.set(settingArgs, function() {
    if (chrome.extension.lastError) {
      console.error('Failed to set ' + settingName.toLowerCase() + '!',
          chrome.extension.lastError);
    } else {
      console.log(settingName + ' has been set successfully.');
      if (opt_callback) {
        opt_callback();
      }
    }
  });
};


/**
 * Set a given privacy setting.
 * @param {!Object} setting The setting to lock down.
 * @param {!Object} settingArgs The required arguments to lock down the setting.
 * @param {string} settingName The name of the setting.
 * @private
 */
flake.setPrivacySetting_ = function(setting, settingArgs, settingName) {
  setting.get({}, function(details) {
    if (details.levelOfControl == 'controllable_by_this_extension') {
      flake.setSetting_(setting, settingArgs, settingName);
    } else {
      console.warn('Access denied to set ' + settingName.toLowerCase() + '.');
    }
  });
};


/**
 * Sets the settings for loading a particular resource.
 * @param {string} origin The origin from which the resource is loaded.
 * @param {string} setting The setting to apply to the given resource.
 * @param {function(...)=} opt_callback An optional callback to invoke once the
 *     setting is applied to the given resource.
 */
flake.setResourceSetting = function(origin, setting, opt_callback) {
  var pattern = origin + '/*';
  flake.setSetting_(chrome.contentSettings.javascript, {
    primaryPattern: pattern,
    setting: setting
  }, 'JavaScript', function() {

    // TODO(radi): Refactor.
    configData.addScriptOrigin(pattern, setting);

    if(opt_callback) {
      opt_callback(setting);
    }
  });
};


/**
 * Gets the settings for loading a particular resource.
 * @param {string} origin The origin from which the resource is loaded.
 * @param {!function(...)} callback The callback to invoke once the settings are
 *     retrieved.
 */
flake.getResourceSetting = function(origin, callback) {
  if (!callback) {
    throw new Error('Missing callback to flake.getResourceSetting');
  }

  chrome.contentSettings.javascript.get({
    primaryUrl: origin + '/*'
  }, function(details) {
    if (chrome.extension.lastError) {
      console.error('Failed to get value for ' + origin + '!\nError details: ',
          chrome.extension.lastError);
    } else {
      callback(origin, details.setting);
    }
  });
};


/**
 * Enables JavaScript for a given origin.
 * @param {string} origin The origin for which to enable JavaScript.
 */
flake.enableJavaScript = function(origin) {
  flake.setSetting_(chrome.contentSettings.javascript, {
    primaryPattern: origin + '/*',
    setting: 'allow',
    scope: 'regular'
  }, 'JavaScript', function() {
    // TODO(radi): Refactor.
    configData.addScriptOrigin(pattern, 'allow');
  });
};


/**
 * Event handlers for handling network and navigation events.
 * @type {!Object}
 */
flake.handlers = {};


/**
 * Enforce user preferences with respect to which traffic is allowed.
 * @param {!Object} details HTTP request details.
 */
flake.handlers.requestFilter = function(details) {
  var url = details.url;
  var requestLog = 'request [' + details.tabId + '][' + details.frameId + '][' +
      details.parentFrameId + '][' + details.type + ']: ' + url;
  
  // Allow all requests destined to our own extension.
  if (url.indexOf(flake.EXTENSION_URL) == 0) {
    return;
  }
  
  // If we are in offline mode, block all requests.
  if (flake.offlineMode) {
    console.log('Blocking offline ' + requestLog);
    return  {cancel: true};
  }

  // Transform HTTP to HTTPS.
  if (flake.upgradeHttpMode && /^http:\/\/i.test(url)) {
    var newUrl = 'https:' + url.substring(5);
    console.log('Upgraded ' + url + ' to ' + newUrl);
    return { redirectUrl: newUrl };
  }

  // Block non-https traffic.
  if (flake.alwaysHttpsMode) {
    if (/^(chrome|https):\/\//.test(details.url)) {
      console.log('Allowing ' + requestLog);
      return;
    } else {
      console.log('Blocking non-HTTPS ' + requestLog);
      return  {cancel: true};
    }
  }

  if (details.type === 'main_frame') {
    flake.tabsHolder.tabs[details.tabId].reset();
  } else if (details.type === 'script') {
    flake.tabsHolder.tabs[details.tabId].add('scripts', url);
  }
  
  console.log('Allowing ' + requestLog);
};

flake.init();
console.log("Flake initialized");

// Temporary hack so that refactoring does not break Flake's functionality.

var dispatchTable = new Array();


dispatchTable['getOrigins'] = function getOrigins(request, sendResponse) {
  var t = flake.tabsHolder.tabs[request.tabId];
  var scripts = {};
  for (var i = 0; i < t.scripts.length; ++i) {
    var origin = getOriginFromUri(t.scripts[i]);
    var config = t.scripts[origin + '/*'];
    if (config === undefined) {
      scripts[origin] = {'setting': 'block'};
    } else {
      scripts[origin] = {'setting': config.setting};
    }
  }

  chrome.tabs.get(request.tabId, function(tab) {
    var tabOrigin = getOriginFromUri(parseUri(tab.url));
    flake.getResourceSetting(tabOrigin, function(origin, value) {
      scripts[origin] = {'setting': value};
      var r = {'scripts': scripts};
      sendResponse(r);
    });
  });
}

dispatchTable['allowResource'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Allowing resource from: ' + origin);
  flake.setResourceSetting(origin, 'allow', function(setting) { 
    sendResponse({'origin': origin, 'setting': setting}); });
}

dispatchTable['blockResource'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Blocking resource from: ' + origin);
  flake.setResourceSetting(origin, 'block', function(setting) { 
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
