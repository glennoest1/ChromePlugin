let statusTimer = null;
let activeReport = null;
let activeReportShare = null;

const ERROR_MESSAGES = {
  NO_ACTIVE_TAB: "noActiveTab",
  RESTRICTED_PAGE: "restrictedPage",
  FILE_ACCESS_REQUIRED: "fileAccessRequired",
  INJECTION_FAILED: "injectionFailed",
  UNSUPPORTED_PAGE: "unsupportedPage",
  MISSING_API_KEY: "missingApiKey",
  INVALID_API_KEY: "invalidApiKey",
  NETWORK_ERROR: "networkError",
  MISSING_BACKEND_URL: "missingBackendUrl",
  INVALID_REPORT: "invalidReport",
  REPORT_TOO_LARGE: "reportTooLarge",
  SERVER_ERROR: "serverError",
  SHARE_FAILED: "shareFailed",
  GZIP_UNSUPPORTED: "gzipUnsupported",
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
    activeReportShare = status.lastReportShare || null;
    renderReport(activeReport, status.hasApiKey, "", activeReportShare);
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
  activeReportShare = status?.lastReportShare || null;
  renderReport(response.report, status?.hasApiKey, "", activeReportShare);
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
    activeReportShare = status?.lastReportShare || null;
    renderReport(activeReport, status?.hasApiKey, bbbT(ERROR_MESSAGES[response?.error] || ERROR_MESSAGES.UNKNOWN_ERROR), activeReportShare);
    attachOpenOptionsLink();
    return;
  }

  activeReport = response.report;
  const status = await sendMessage({ action: "getStatus" });
  activeReportShare = status?.lastReportShare || null;
  renderReport(activeReport, true, "", activeReportShare);
}

async function shareActiveReport() {
  const button = document.getElementById("shareButton");
  if (!activeReport) {
    renderShareStatus("error", escapeHtml(bbbT("emptyReport")));
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = bbbT("sharing");
  }
  renderShareStatus("loading", escapeHtml(bbbT("shareUploading")));

  const response = await sendMessage({ action: "shareReport" });
  if (!response?.ok) {
    renderShareStatus("error", escapeHtml(bbbT(ERROR_MESSAGES[response?.error] || "shareFailed")));
    if (button) {
      button.disabled = false;
      button.textContent = bbbT("share");
    }
    return;
  }

  let copied = false;
  try {
    await navigator.clipboard.writeText(response.url);
    copied = true;
  } catch {
    copied = false;
  }

  activeReportShare = response;
  renderShareResult(response, copied ? bbbT("shareCopied") : bbbT("shareCopyManual"));

  if (button) {
    button.disabled = false;
    button.textContent = bbbT("share");
  }
}

function renderShareStatus(kind, html) {
  const status = document.getElementById("shareStatus");
  if (!status) return;
  status.hidden = false;
  status.className = `report-share-status ${kind}`;
  status.innerHTML = html;
}

function renderStoredShareResult(shareResult) {
  if (!shareResult?.url) return;
  activeReportShare = shareResult;
  renderShareResult(shareResult, bbbT("shareReady"));
}

function renderShareResult(shareResult, message) {
  const expiresAt = shareResult.expiresAt ? formatDateTime(shareResult.expiresAt) : bbbT("unknown");
  const replayViewerUrl = shareResult.shareId
    ? chrome.runtime.getURL(`replay/replay.html?shareId=${encodeURIComponent(shareResult.shareId)}`)
    : "";
  renderShareStatus("success", `
    <div>${escapeHtml(message)}</div>
    <a href="${escapeHtml(shareResult.url)}" target="_blank" rel="noreferrer">${escapeHtml(shareResult.url)}</a>
    <div>${escapeHtml(bbbT("shareExpiresAt", { expiresAt }))}</div>
  `);
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
