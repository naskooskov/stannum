/**
 * Handle the options for the extension.
 */
chrome.runtime.getBackgroundPage(function(page) {
  stannum = page.stannum;
  var $ = document.getElementById.bind(document);

  $('offlineMode').checked = stannum.offlineMode;
  $('onlyHttps').checked = stannum.alwaysHttpsMode;
  $('upgradeHttp').checked = stannum.upgradeHttpMode;

  $('offlineMode').addEventListener('click', function() {
    if (stannum) {
      stannum.toggleOffline();
    }
  });
  $('onlyHttps').addEventListener('click', function() {
    if (stannum) {
      stannum.toggleAlwaysHttpsMode();
    }
  });
  $('upgradeHttp').addEventListener('click', function() {
    if (stannum) {
      stannum.toggleUpgradeHttpMode();
    }
  });
});
