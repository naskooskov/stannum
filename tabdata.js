
// Initialize the namespace.
flake = window.flake || {}



/**
 * A representation of a tab and the resources that have been loaded inside it.
 * @param {number} tabId The ID of the tab.
 * @constructor
 */
flake.TabInstance = function(tabId) {
  /**
   * The ID of the tab.
   * @type {number}
   */
  this.tabId = tabId;

  /**
   * A collection of scripts that have been loaded inside the tab.
   * @type {!Array}
   */
  this.scripts = [];

  /**
   * A collection of stylesheets that have been loaded inside the tab.
   * @type {!Array}
   */
  this.stylesheets = [];

  /**
   * A collection of objects that have been loaded inside the tab.
   * @type {!Array}
   */
  this.objects = [];

  /**
   * A collection of XHRs that have been made by the tab.
   * @type {!Array}
   */
  this.xhrs = [];

  /**
   * A collection of 'others'.
   * TODO(radi/nasko): Define what this is.
   * @type {!Array}
   */
  this.others = [];

  /**
   * A collection of script origins, which are temporarily allowed and
   * should be blocked once the tab is closed. This array should not be
   * cleared on reload, as it must keep all temporary exceptions for the
   * lifetime of the tab.
   */
  this.tempSciptExceptions = [];
};


flake.TabInstance.prototype.add = function(objType, uri) {
  this[objType].push(uri);
};


flake.TabInstance.prototype.reset = function() {
  for (var prop in this) {
    // Skip the temporary exceptions, which are bound to the lifetime of the
    // tab.
    if (prop === 'tempSciptExceptions')
      continue;

    if (this[prop] instanceof Array) {
      this[prop] = [];
    }
  }
};



/**
 * An object to allow easier management of collections of tab representations.
 * @constructor
 */
flake.TabData = function() {
  this.tabs = {};
};


/**
 * Register a tab so that its resources can be properly managed.
 * @param {!Object} tab The tab to register.
 */
flake.TabData.prototype.registerTab = function(tab) {
  this.tabs[tab.id] = new flake.TabInstance(tab.id);
};


/**
 * Unregister a tab.
 * @param {number} tabId The ID of the tab to unregister.
 */
flake.TabData.prototype.unregisterTab = function(tabId) {
  var tab = this.tabs[tabId];
  if (tab !== undefined) {
    // Block all temporary exceptions for the lifetime of this tab.
    tab.tempSciptExceptions.forEach(function(origin) {
      flake.setResourceSetting(origin, 'block');
    });
  }
  delete this.tabs[tabId];
};


/**
 * A collection of managed tabs.
 * @type {!flake.TabData}
 */
flake.tabsHolder = new flake.TabData();


/**
 * Start monitoring the Chrome tabs.
 */
flake.initTabs = function() {
  // Register all existing tabs.
  chrome.tabs.query({}, function(tabsArray) {
    tabsArray.forEach(function(tab) {
      flake.tabsHolder.registerTab(tab);
    });
  });

  // Register new tabs upon creation.
  chrome.tabs.onCreated.addListener(function(tab) {
    flake.tabsHolder.registerTab(tab);
  });

  // Unregister a tab when it's being closed.
  chrome.tabs.onRemoved.addListener(function(tabId) {
    flake.tabsHolder.unregisterTab(tabId);
  });
};
