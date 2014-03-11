
// Initialize the namespace.
stannum = window.stannum || {}



/**
 * A representation of a tab and the resources that have been loaded inside it.
 * @param {number} tabId The ID of the tab.
 * @constructor
 */
stannum.TabInstance = function(tabId) {
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


stannum.TabInstance.prototype.add = function(objType, uri) {
  this[objType].push(uri);
};


stannum.TabInstance.prototype.reset = function() {
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
stannum.TabData = function() {
  this.tabs = {};
};


/**
 * Register a tab so that its resources can be properly managed.
 * @param {!Object} tab The tab to register.
 */
stannum.TabData.prototype.registerTab = function(tab) {
  this.tabs[tab.id] = new stannum.TabInstance(tab.id);
};


/**
 * Unregister a tab.
 * @param {number} tabId The ID of the tab to unregister.
 */
stannum.TabData.prototype.unregisterTab = function(tabId) {
  var tab = this.tabs[tabId];
  if (tab !== undefined) {
    // Block all temporary exceptions for the lifetime of this tab.
    tab.tempSciptExceptions.forEach(function(origin) {
      stannum.setResourceSetting(origin, 'block');
    });
  }
  delete this.tabs[tabId];
};


/**
 * A collection of managed tabs.
 * @type {!stannum.TabData}
 */
stannum.tabsHolder = new stannum.TabData();


/**
 * Start monitoring the Chrome tabs.
 */
stannum.initTabs = function() {
  // Register all existing tabs.
  chrome.tabs.query({}, function(tabsArray) {
    tabsArray.forEach(function(tab) {
      stannum.tabsHolder.registerTab(tab);
    });
  });

  // Register new tabs upon creation.
  chrome.tabs.onCreated.addListener(function(tab) {
    stannum.tabsHolder.registerTab(tab);
  });

  // Unregister a tab when it's being closed.
  chrome.tabs.onRemoved.addListener(function(tabId) {
    stannum.tabsHolder.unregisterTab(tabId);
  });
};
