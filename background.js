
// Initialize the namespace.
stannum = window.stannum || {};


/**
 * The URL of the Stannum extension.
 * @type {string}
 */
stannum.EXTENSION_URL = chrome.extension.getURL('');


/**
 * Specifies if Chrome is to be in offline mode.
 * @type {boolean}
 */
stannum.offlineMode = false;


/**
 * Specifies if all outgoing requests should be over HTTPS.
 * @type {boolean}
 */
stannum.alwaysHttpsMode = false;


/**
 * Specifies if all outgoing HTTP requests should be upgraded to HTTPS.
 * @type {boolean}
 */
stannum.upgradeHttpMode = false;


/**
 * Initialize Stannum.
 */
stannum.init = function() {
  // Install the web request filter as the first order of initialization
  chrome.webRequest.onBeforeRequest.addListener(
    stannum.handlers.requestFilter,
    {urls: ["<all_urls>"]},
    ["blocking"]
  );

  stannum.lockDownContentSettings();
  stannum.lockDownPrivacySettings();
  chrome.extension.onRequest.addListener(msgListener);
  // TODO(radi): Rename once config.js is refactored.
  initConfig();
  stannum.initTabs();
};


/**
 * Enables/disables the offline mode in Chrome.
 * @return {boolean} True if offline mode is enabled.
 */
stannum.toggleOffline = function() {
  stannum.offlineMode = !stannum.offlineMode;
  chrome.webRequest.handlerBehaviorChanged();

  return stannum.offlineMode;
};


/**
 * Enables/disables the always HTTPS mode in Chrome.
 * @return {boolean} True if always HTTPS mode is enabled.
 */
stannum.toggleAlwaysHttpsMode = function() {
  stannum.alwaysHttpsMode = !stannum.alwaysHttpsMode;
  chrome.webRequest.handlerBehaviorChanged();

  return stannum.alwaysHttpsMode;
};


/**
 * Enables/disables the upgrade HTTP to HTTPS mode in Chrome.
 * @return {boolean} True if upgrade HTTP to HTTPS mode is enabled.
 */
stannum.toggleUpgradeHttpMode = function() {
  stannum.upgradeHttpMode = !stannum.upgradeHttpMode;
  chrome.webRequest.handlerBehaviorChanged();

  return stannum.upgradeHttpMode;
};


/**
 * Lock down the content settings.
 */
stannum.lockDownContentSettings = function() {
  var defaultArgs = {
    primaryPattern: '<all_urls>',
    setting: 'block',
    scope: 'regular'
  };

  stannum.setSetting_(
      chrome.contentSettings.javascript, defaultArgs, 'JavaScript');

  stannum.setSetting_(chrome.contentSettings.cookies, function() {
    var args = JSON.parse(JSON.stringify(defaultArgs));
    args.secondaryPattern = '<all_urls>';
    args.setting = 'session_only';

    return args;
  }(), 'Cookie persistence');

  stannum.setSetting_(chrome.contentSettings.plugins, defaultArgs, 'Plugins');
  stannum.setSetting_(chrome.contentSettings.popups, defaultArgs, 'Popups');
  stannum.setSetting_(
      chrome.contentSettings.notifications, defaultArgs, 'Notifications');
};


/**
 * Lock down the privacy settings.
 */
stannum.lockDownPrivacySettings = function() {
  var args = {value: false};
  var settingsMap = {
    'Auto-fill': chrome.privacy.services.autofillEnabled,
    'Alternate error pages': chrome.privacy.services.alternateErrorPagesEnabled,
    'Safe-browsing': chrome.privacy.services.safeBrowsingEnabled,
    'Search suggest': chrome.privacy.services.searchSuggestEnabled,
    'Spelling': chrome.privacy.services.spellingServiceEnabled,
    'Translation service': chrome.privacy.services.translationServiceEnabled,
    'Network prediction': chrome.privacy.network.networkPredictionEnabled,
    'Third-party cookies': chrome.privacy.websites.thirdPartyCookiesAllowed,
    'Hyperlink auditing': chrome.privacy.websites.hyperlinkAuditingEnabled
  };

  for (settingName in settingsMap) {
    stannum.setPrivacySetting_(settingsMap[settingName], args, settingName);
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
stannum.setSetting_ = function(setting, settingArgs, settingName, opt_callback) {
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
stannum.setPrivacySetting_ = function(setting, settingArgs, settingName) {
  setting.get({}, function(details) {
    if (details.levelOfControl == 'controllable_by_this_extension' ||
        details.levelOfControl == 'controlled_by_this_extension') {
      stannum.setSetting_(setting, settingArgs, settingName);
    } else {
      console.warn('Access denied to set ' + settingName.toLowerCase()
          + ': ' + details.levelOfControl);
    }
  });
};


/**
 * Sets the settings for loading a particular resource.
 * @param {string} origin The origin from which the resource is loaded.
 * @param {string} setting The setting to apply to the given resource.
 * @param {boolean} temp Inidicator whether the setting should be temporary
 *     or not.
 * @param {function(...)=} opt_callback An optional callback to invoke once the
 *     setting is applied to the given resource.
 */
stannum.setResourceSetting = function(origin, setting, temp, opt_callback) {
  var pattern = origin + '/*';
  stannum.setSetting_(chrome.contentSettings.javascript, {
    primaryPattern: pattern,
    setting: setting
  }, 'JavaScript', function() {

    if (!temp) {
      // TODO(radi): Refactor.
      configData.addScriptOrigin(pattern, setting);
    }

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
stannum.getResourceSetting = function(origin, callback) {
  if (!callback) {
    throw new Error('Missing callback to stannum.getResourceSetting');
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
stannum.enableJavaScript = function(origin) {
  stannum.setSetting_(chrome.contentSettings.javascript, {
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
stannum.handlers = {};


/**
 * Enforce user preferences with respect to which traffic is allowed.
 * @param {!Object} details HTTP request details.
 */
stannum.handlers.requestFilter = function(details) {
  var url = details.url;
  var requestLog = 'request [' + details.tabId + '][' + details.frameId + '][' +
      details.parentFrameId + '][' + details.type + ']: ' + url;

  // Allow all requests destined to our own extension.
  if (url.indexOf(stannum.EXTENSION_URL) == 0) {
    return;
  }

  // If we are in offline mode, block all requests.
  if (stannum.offlineMode) {
    console.log('Blocking offline ' + requestLog);
    return  {cancel: true};
  }

  // Transform HTTP to HTTPS.
  if (stannum.upgradeHttpMode && /^http:\/\//i.test(url)) {
    var newUrl = 'https:' + url.substring(5);
    console.log('Upgraded ' + url + ' to ' + newUrl);
    return { redirectUrl: newUrl };
  }

  // Block non-https traffic.
  if (stannum.alwaysHttpsMode) {
    if (/^(chrome|https):\/\//.test(details.url)) {
      console.log('Allowing ' + requestLog);
    } else {
      console.log('Blocking non-HTTPS ' + requestLog);
      return  {cancel: true};
    }
  }

  var tab = stannum.tabsHolder.tabs[details.tabId];
  if (tab) {
    if (details.type === 'main_frame') {
      tab.reset();
    } else if (details.type === 'script') {
      tab.add('scripts', url);
    }
  }

  console.log('Allowing ' + requestLog);
};

stannum.init();
console.log("Stannum initialized");

// Temporary hack so that refactoring does not break Stannum's functionality.

var dispatchTable = new Array();


dispatchTable['getOrigins'] = function getOrigins(request, sendResponse) {
  var t = stannum.tabsHolder.tabs[request.tabId];
  var scripts = {};
  for (var i = 0; i < t.scripts.length; ++i) {
    var origin = getOriginFromUrl(t.scripts[i]);
    var config = t.scripts[origin + '/*'];
    if (config === undefined) {
      scripts[origin] = {'setting': 'block'};
    } else {
      scripts[origin] = {'setting': config.setting};
    }
  }

  chrome.tabs.get(request.tabId, function(tab) {
    var tabOrigin = getOriginFromUrl(tab.url);
    stannum.getResourceSetting(tabOrigin, function(origin, value) {
      scripts[origin] = {'setting': value};
      var r = {'scripts': scripts};
      sendResponse(r);
    });
  });
}

dispatchTable['allowResource'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Allowing resource from: ' + origin);
  stannum.setResourceSetting(origin, 'allow', false, function(setting) {
    sendResponse({'origin': origin, 'setting': setting}); });
}

dispatchTable['allowResourceTemp'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Allowing temporarily resource from: ' + origin);
  if (stannum.tabsHolder.tabs[request.tabId] !== undefined) {
    stannum.tabsHolder.tabs[request.tabId].tempSciptExceptions.push(origin);
  }
  stannum.setResourceSetting(origin, 'allow', true, function(setting) {
    sendResponse({'origin': origin, 'setting': setting}); });

}

dispatchTable['blockResource'] = function(request, sendResponse) {
  var origin = request.origin;
  console.log('Blocking resource from: ' + origin);
  stannum.setResourceSetting(origin, 'block', function(setting) {
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
