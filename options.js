function $(id) {
  return document.getElementById(id);
}

function setOfflineState(response) {
  console.log("OfflineMode: " + response.offline);
  $('offlineMode').checked = response.offline;
}
function toggleOffline() {
  chrome.extension.sendRequest({msg: "toggleOfflineMode"}, setOfflineState);
}

function setHttpsState(response) {
  console.log("OnlyHttps: " + response.onlyHttps);
  $('onlyHttps').checked = response.onlyHttps;
}
function toggleHttps() {
  chrome.extension.sendRequest({msg: "toggleHttps"}, setHttpsState);
}

function setUpgradeHttpState(response) {
  console.log("UpgradeHttp: " + response.upgradeHttp);
  $('upgradeHttp').checked = response.upgradeHttp;
}
function toggleUpgradeHttp() {
  chrome.extension.sendRequest({msg: "toggleUpgradeHttp"}, setUpgradeHttpState);
}

function init() {
  chrome.extension.sendRequest({msg: "getOfflineMode"}, setOfflineState);
  chrome.extension.sendRequest({msg: "getOptions"}, setHttpsState);
  
  $('offlineMode').onclick = toggleOffline;
  $('onlyHttps').onclick = toggleHttps;
  $('upgradeHttp').onclick = toggleUpgradeHttp;
}

document.addEventListener('DOMContentLoaded', init);
