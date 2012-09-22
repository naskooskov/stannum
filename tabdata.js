
function TabInstance(tab_id) {
  this.tabId = tab_id;
  this.scripts = new Array();
  this.stylesheets = new Array();
  this.objects = new Array();
  this.xhrs = new Array();
  this.others = new Array();
}

function TabData() {
  this.tabs = new Array();
  
  this.addTab = function(tab) {
    this.tabs[tab.id] = new TabInstance(tab.id);
  }
  
  this.removeTab = function(tabId) {
    delete this.tabs[tabId];
  }

  this.addScripts = function(id, uri) {
    if (this.tabs[id] !== undefined) {
      this.tabs[id].scripts.push(uri);
    }
  }
  
  this.resetTab = function(tabId) {
    this.tabs[tabId] = new TabInstance(tabId);
  }
}

var tabsData = new TabData();

function enumTabs() {
  chrome.tabs.query({}, function(tabsArray) {
    tabsArray.forEach(function(tab) {
      tabsData.addTab(tab);
    });
  });
}

function registerTabListeners() {
  chrome.tabs.onCreated.addListener(
    function(tab) {
      //console.log("opener is " + tab.openerTabId);
      tabsData.addTab(tab);
    }
  );

  chrome.tabs.onUpdated.addListener(
    function(tabId, info, tab) {
      console.log('tab updated[' + tabId + '] |' + info.status + '|\t|' + info.url + '|\t' + ((info.pinned) ? 'pinned' : '' ));
    }
  );

  chrome.tabs.onRemoved.addListener(
    function(tabId, info) {
      tabsData.removeTab(tabId);
    }
  );
}

function initTabs() {
  registerTabListeners();
  enumTabs();
}

