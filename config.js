
function ScriptSetting() {
  this.pattern;
  this.setting;
}

// This object stores configuration data to be applied when the extension
// initializes. It stores only overrides to the default policy.
function ConfigData() {
  this.init = function() {
    this.scripts = {};
  }

  this.addScriptOrigin = function(pattern, setting) {
    // If a pattern exists and we want to block it, just remove it as the
    // default policy is to block.
    if (this.scripts[pattern] !== undefined && setting === 'block') {
      delete this.scripts[pattern];
    } else {
      var s = new ScriptSetting();
      s.pattern = pattern;
      s.setting = setting;
      this.scripts[pattern] = s;
    }

    this.save();
  }

  this.save = function() {
    var scripts = JSON.stringify(this.scripts);
    localStorage.setItem('scripts', scripts);
  }

  this.load = function() {
    var scripts = localStorage.getItem('scripts');
    this.scripts = JSON.parse(scripts);
  }

  this.applyConfig = function() {
    for (var pattern in this.scripts) {
      var setting = this.scripts[pattern].setting;
      chrome.contentSettings.javascript.set(
        { 'primaryPattern': pattern, 'setting': setting, 'scope': 'regular' }
      );
    }
  }
}

var configData = new ConfigData();

function initConfig() {
  configData.init();
  configData.load();
  configData.applyConfig();
}
