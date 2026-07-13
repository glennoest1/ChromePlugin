const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const statusEl = document.getElementById("status");

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
clearButton.addEventListener("click", clearSettings);

async function loadSettings() {
  await bbbInitI18n();
  renderLocalizedOptions();
  const { apiConfig } = await chrome.storage.local.get("apiConfig");
  if (apiConfig?.apiKey) {
    apiKeyInput.value = apiConfig.apiKey;
    showStatus(bbbT("keySavedLoaded"));
  }
}

function renderLocalizedOptions() {
  document.title = `${bbbT("settings")} - Bug Black Box`;
  document.getElementById("languageSlot").innerHTML = bbbRenderLanguageSelect();
  document.getElementById("apiKeyTitle").textContent = bbbT("apiKeyTitle");
  document.getElementById("apiKeyDesc").textContent = bbbT("apiKeyDesc");
  document.getElementById("apiKeyLabel").textContent = bbbT("apiKeyLabel");
  document.getElementById("togglePassword").title = bbbT("showHideKey");
  document.getElementById("togglePassword").setAttribute("aria-label", bbbT("showHideKey"));
  document.getElementById("togglePassword").textContent = bbbT("showKey");
  saveButton.textContent = bbbT("saveKey");
  clearButton.textContent = bbbT("clearKey");
  document.getElementById("keyFooter").innerHTML = `${escapeHtml(bbbT("keyFooter")).replace("chrome.storage.local", "<code>chrome.storage.local</code>")}`;
  bbbWireLanguageSelect();
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus(bbbT("enterApiKey"), true);
    return;
  }

  await chrome.storage.local.set({
    apiConfig: { apiKey }
  });
  showStatus(bbbT("keySaved"));
}

async function clearSettings() {
  apiKeyInput.value = "";
  await chrome.storage.local.set({
    apiConfig: { apiKey: "" }
  });
  showStatus(bbbT("keyCleared"));
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}
