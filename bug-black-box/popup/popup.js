let statusTimer = null;
let activeReport = null;

const ERROR_MESSAGES = {
  NO_ACTIVE_TAB: "Khong tim thay tab dang mo. Hay mo mot trang web binh thuong roi thu lai.",
  RESTRICTED_PAGE: "Chrome khong cho extension ghi tren trang noi bo nhu chrome://extensions. Hay mo website thuong, localhost hoac trang demo.",
  FILE_ACCESS_REQUIRED: "Trang file:// can bat quyen file. Vao chrome://extensions, chon Bug Black Box, bat Allow access to file URLs roi reload trang demo.",
  INJECTION_FAILED: "Chrome da chan recorder tren trang nay. Hay reload tab hien tai roi bam Start lai, hoac thu tren localhost.",
  UNSUPPORTED_PAGE: "Khong the ghi tren trang nay. Hay thu tren website thuong, localhost hoac trang demo.",
  MISSING_API_KEY: "Can cau hinh Gemini API key trong Settings truoc khi dung AI Explain.",
  INVALID_API_KEY: "API key khong hop le. Hay kiem tra lai trong Settings.",
  NETWORK_ERROR: "Khong the ket noi toi may chu AI. Hay kiem tra ket noi mang.",
  RATE_LIMIT: "Da vuot gioi han su dung API. Thu lai sau it phut.",
  EMPTY_RESPONSE: "AI tra ve noi dung rong.",
  EMPTY_REPORT: "Khong co report de giai thich.",
  NO_ERRORS: "Report nay khong co loi JavaScript hoac console.error de giai thich.",
  UNKNOWN_ERROR: "AI Explain bi loi. Thu lai sau."
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
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
  button.textContent = "Starting...";

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
  button.textContent = "Creating report...";

  const response = await sendMessage({ action: "stopRecording" });
  if (!response?.ok || !response.report) {
    renderIdle("Unable to create a report.");
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
    button.textContent = "Explaining...";
  }

  const response = await sendMessage({ action: "explainReport" });

  if (!response?.ok) {
    const status = await sendMessage({ action: "getStatus" });
    renderReport(activeReport, status?.hasApiKey, ERROR_MESSAGES[response?.error] || ERROR_MESSAGES.UNKNOWN_ERROR);
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
  const baseMessage = ERROR_MESSAGES[response?.error] || "Khong the bat dau recording.";
  const tabUrl = response?.tabUrl ? `\nTab hien tai: ${response.tabUrl}` : "";
  return `${baseMessage}${tabUrl}`;
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message).catch((error) => ({
    ok: false,
    error: error.message || "UNKNOWN_ERROR"
  }));
}
