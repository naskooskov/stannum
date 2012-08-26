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

function init() {
  chrome.extension.sendRequest({msg: "getOfflineMode"}, setOfflineState);
  chrome.extension.sendRequest({msg: "getOptions"}, setHttpsState);
  
  $('offlineMode').onclick = toggleOffline;
  $('onlyHttps').onclick = toggleHttps;
}

document.addEventListener('DOMContentLoaded', init);
