const apiKeyInput = document.getElementById("apiKey");
const backendBaseUrlInput = document.getElementById("backendBaseUrl");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const statusEl = document.getElementById("status");

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
clearButton.addEventListener("click", clearSettings);

async function loadSettings() {
  await bbbInitI18n();
  renderLocalizedOptions();
  const { apiConfig, backendConfig } = await chrome.storage.local.get(["apiConfig", "backendConfig"]);
  if (apiConfig?.apiKey) {
    apiKeyInput.value = apiConfig.apiKey;
    showStatus(bbbT("keySavedLoaded"));
  }
  if (backendConfig?.baseUrl) {
    backendBaseUrlInput.value = backendConfig.baseUrl;
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
  document.getElementById("backendUrlTitle").textContent = bbbT("backendUrlTitle");
  document.getElementById("backendUrlDesc").textContent = bbbT("backendUrlDesc");
  document.getElementById("backendUrlLabel").textContent = bbbT("backendUrlLabel");
  saveButton.textContent = bbbT("saveSettings");
  clearButton.textContent = bbbT("clearKey");
  document.getElementById("keyFooter").innerHTML = `${escapeHtml(bbbT("keyFooter")).replace("chrome.storage.local", "<code>chrome.storage.local</code>")}`;
  bbbWireLanguageSelect();
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const baseUrl = backendBaseUrlInput.value.trim();
  if (baseUrl && !isValidHttpUrl(baseUrl)) {
    showStatus(bbbT("invalidBackendUrl"), true);
    return;
  }

  await chrome.storage.local.set({
    apiConfig: { apiKey },
    backendConfig: { baseUrl }
  });
  showStatus(bbbT("settingsSaved"));
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

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
