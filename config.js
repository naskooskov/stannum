
function ScriptSetting() {
  this.pattern;
  this.setting;
}

function ConfigData() {
  this.scripts = {};

  this.addScriptOrigin = function(pattern, setting) {
    var s = new ScriptSetting();
    s.pattern = pattern;
    s.setting = setting;
    this.scripts[pattern] = s;

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
  configData.load();
  configData.applyConfig();
}
