let statusTimer = null;
let activeReport = null;

const ERROR_MESSAGES = {
  NO_ACTIVE_TAB: "noActiveTab",
  RESTRICTED_PAGE: "restrictedPage",
  FILE_ACCESS_REQUIRED: "fileAccessRequired",
  INJECTION_FAILED: "injectionFailed",
  UNSUPPORTED_PAGE: "unsupportedPage",
  MISSING_API_KEY: "missingApiKey",
  INVALID_API_KEY: "invalidApiKey",
  NETWORK_ERROR: "networkError",
  RATE_LIMIT: "rateLimit",
  EMPTY_RESPONSE: "emptyResponse",
  EMPTY_REPORT: "emptyReport",
  NO_ERRORS: "noErrors",
  UNKNOWN_ERROR: "unknownAiError"
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await bbbInitI18n();
  const status = await sendMessage({ action: "getStatus" });
  if (status?.recordingState?.isRecording) {
    renderRecording(status.recordingState, status.counts);
  } else if (status?.lastReport) {
    activeReport = status.lastReport;
    renderReport(activeReport, status.hasApiKey);
  } else {
    renderIdle();
  }
}

function clearTimer() {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

async function startRecording() {
  const button = document.getElementById("startButton");
  const mode = document.querySelector("input[name='recordingMode']:checked")?.value || "activeTab";
  button.disabled = true;
  button.textContent = bbbT("starting");

  const response = await sendMessage({ action: "startRecording", mode });
  if (!response?.ok) {
    renderIdle(buildStartErrorMessage(response));
    return;
  }

  renderRecording(response.recordingState, {});
}

async function stopRecording() {
  const button = document.getElementById("stopButton");
  button.disabled = true;
  button.textContent = bbbT("creatingReport");

  const response = await sendMessage({ action: "stopRecording" });
  if (!response?.ok || !response.report) {
    renderIdle(bbbT("unableCreateReport"));
    return;
  }

  const status = await sendMessage({ action: "getStatus" });
  renderReport(response.report, status?.hasApiKey);
}

async function resetReport() {
  await sendMessage({ action: "resetReport" });
  renderIdle();
}

async function explainWithAI() {
  const button = document.getElementById("explainButton");
  if (button) {
    button.disabled = true;
    button.textContent = bbbT("explaining");
  }

  const response = await sendMessage({ action: "explainReport" });

  if (!response?.ok) {
    const status = await sendMessage({ action: "getStatus" });
    renderReport(activeReport, status?.hasApiKey, bbbT(ERROR_MESSAGES[response?.error] || ERROR_MESSAGES.UNKNOWN_ERROR));
    attachOpenOptionsLink();
    return;
  }

  activeReport = response.report;
  renderReport(activeReport, true);
}

function attachOpenOptionsLink() {
  const link = document.getElementById("openOptionsLink");
  if (link) link.addEventListener("click", openOptions);
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

function openReplayPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("replay/replay.html")
  });
}

function buildStartErrorMessage(response) {
  const baseMessage = bbbT(ERROR_MESSAGES[response?.error] || "cannotStart");
  const tabUrl = response?.tabUrl ? `\n${bbbT("currentTabLine", { url: response.tabUrl })}` : "";
  return `${baseMessage}${tabUrl}`;
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message).catch((error) => ({
    ok: false,
    error: error.message || "UNKNOWN_ERROR"
  }));
}
