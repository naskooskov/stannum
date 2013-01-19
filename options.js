/**
 * Handle the options for the extension.
 */
chrome.runtime.getBackgroundPage(function(page) {
  flake = page.flake;
  var $ = document.getElementById.bind(document);
  
  $('offlineMode').checked = flake.offlineMode;
  $('onlyHttps').checked = flake.alwaysHttpsMode;
  $('upgradeHttp').checked = flake.upgradeHttpMode;

  $('offlineMode').addEventListener('click', function() {
    if (flake) {
      flake.toggleOffline();
    }
  });
  $('onlyHttps').addEventListener('click', function() {
    if (flake) {
      flake.toggleAlwaysHttpsMode();
    }
  });
  $('upgradeHttp').addEventListener('click', function() {
    if (flake) {
      flake.toggleUpgradeHttpMode();
    }
  });
});