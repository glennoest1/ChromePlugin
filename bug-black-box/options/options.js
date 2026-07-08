const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const statusEl = document.getElementById("status");

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
clearButton.addEventListener("click", clearSettings);

async function loadSettings() {
  const { apiConfig } = await chrome.storage.local.get("apiConfig");
  if (apiConfig?.apiKey) {
    apiKeyInput.value = apiConfig.apiKey;
    showStatus("Gemini API key is saved.");
  }
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus("Enter an API key first.", true);
    return;
  }

  await chrome.storage.local.set({
    apiConfig: { apiKey }
  });
  showStatus("Gemini API key saved.");
}

async function clearSettings() {
  apiKeyInput.value = "";
  await chrome.storage.local.set({
    apiConfig: { apiKey: "" }
  });
  showStatus("Gemini API key cleared.");
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}
