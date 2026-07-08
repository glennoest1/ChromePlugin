const app = document.getElementById("app");
let statusTimer = null;
let activeReport = null;
const PREVIEW_TEXT_LIMIT = 1600;

const ERROR_MESSAGES = {
  NO_ACTIVE_TAB: "Không tìm thấy tab đang mở. Hãy mở một trang web bình thường rồi thử lại.",
  RESTRICTED_PAGE: "Chrome không cho extension ghi trên trang nội bộ như chrome://extensions. Hãy mở website thường, localhost hoặc trang demo.",
  FILE_ACCESS_REQUIRED: "Trang file:// cần bật quyền file. Vào chrome://extensions, chọn Bug Black Box, bật Allow access to file URLs rồi reload trang demo.",
  INJECTION_FAILED: "Chrome đã chặn recorder trên trang này. Hãy reload tab hiện tại rồi bấm Start lại, hoặc thử trên localhost.",
  UNSUPPORTED_PAGE: "Không thể ghi trên trang này. Hãy thử trên website thường, localhost hoặc trang demo.",
  MISSING_API_KEY: "Cần cấu hình Gemini API key trong Settings trước khi dùng AI Explain.",
  INVALID_API_KEY: "API key không hợp lệ. Hãy kiểm tra lại trong Settings.",
  NETWORK_ERROR: "Không thể kết nối tới máy chủ AI. Hãy kiểm tra kết nối mạng.",
  RATE_LIMIT: "Đã vượt giới hạn sử dụng API. Thử lại sau ít phút.",
  EMPTY_RESPONSE: "AI trả về nội dung rỗng.",
  EMPTY_REPORT: "Không có report để giải thích.",
  NO_ERRORS: "Report này không có lỗi JavaScript hoặc console.error để giải thích.",
  UNKNOWN_ERROR: "AI Explain bị lỗi. Thử lại sau."
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

function renderIdle(message = "") {
  clearTimer();
  activeReport = null;
  app.innerHTML = `
    <section class="panel">
      <div class="header">
        <h1>Bug Black Box</h1>
        <button class="icon-button" id="settingsButton" title="Settings" aria-label="Settings">&#9881;</button>
      </div>
      <p class="muted">Ghi thao tác, console log, lỗi JavaScript, screenshot và failed request thành bug report có cấu trúc.</p>
      ${message ? `<div class="error">${escapeHtml(message)}</div>` : ""}
      <div class="notice">Lưu ý: không bấm Start khi đang ở chrome://extensions. Với trang demo, hãy mở qua localhost hoặc bật quyền file URL cho extension.</div>
      <button class="button button-red" id="startButton">Start Recording</button>
      <p class="muted">Recording chỉ bắt đầu sau khi bạn bấm Start. Extension không ghi input value, password, cookie hoặc request body.</p>
    </section>
  `;

  document.getElementById("startButton").addEventListener("click", startRecording);
  document.getElementById("settingsButton").addEventListener("click", openOptions);
}

function renderRecording(recordingState, counts = {}) {
  clearTimer();

  app.innerHTML = `
    <section class="panel">
      <div class="status-banner">
        <span class="record-dot" aria-hidden="true"></span>
        <span>Recording... <span id="timer">${formatDuration(recordingState.startedAt)}</span></span>
      </div>
      <div class="stats">
        ${stat(counts.console || 0, "logs")}
        ${stat((counts.jsError || 0) + (counts.consoleError || 0), "errors")}
        ${stat((counts.click || 0) + (counts.submit || 0), "actions")}
        ${stat(counts.networkError || 0, "network")}
      </div>
      <button class="button button-dark" id="stopButton">Stop & Create Report</button>
      <p class="muted">Keep the target tab open until the screenshot is captured.</p>
    </section>
  `;

  document.getElementById("stopButton").addEventListener("click", stopRecording);

  statusTimer = setInterval(async () => {
    const timer = document.getElementById("timer");
    if (timer) timer.textContent = formatDuration(recordingState.startedAt);

    const status = await sendMessage({ action: "getStatus" });
    if (status?.recordingState?.isRecording) {
      updateStats(status.counts || {});
    }
  }, 1000);
}

function updateStats(counts) {
  const values = document.querySelectorAll(".stat strong");
  if (values.length < 4) return;
  values[0].textContent = counts.console || 0;
  values[1].textContent = (counts.jsError || 0) + (counts.consoleError || 0);
  values[2].textContent = (counts.click || 0) + (counts.submit || 0);
  values[3].textContent = counts.networkError || 0;
}

function renderReport(report, hasApiKey = false, aiMessage = "") {
  clearTimer();
  activeReport = report;

  const counts = countEvents(report.events);
  const hasErrors = counts.jsError + counts.consoleError > 0;
  const steps = report.events.filter((event) => event.type === "click" || event.type === "submit");
  const jsErrors = report.events.filter((event) => event.type === "jsError");
  const networkErrors = report.events.filter((event) => event.type === "networkError");
  const showExplain = hasErrors;

  app.innerHTML = `
    <section class="panel">
      <div class="header">
        <h1>Report Ready</h1>
        <button class="icon-button" id="settingsButton" title="Settings" aria-label="Settings">&#9881;</button>
      </div>
      <div class="${hasErrors ? "error" : "success"}">
        ${hasErrors ? `Found ${counts.jsError + counts.consoleError} JavaScript/console error(s).` : "No JavaScript errors were detected while recording."}
      </div>
      <div class="section">
        <p><strong>URL:</strong> ${escapeHtml(report.tabUrl || "Unknown")}</p>
        <p><strong>Duration:</strong> ${report.durationSeconds || 0}s</p>
        <p><strong>Captured:</strong> ${counts.console} logs, ${steps.length} actions, ${networkErrors.length} network errors</p>
      </div>
      ${report.screenshotBase64 ? `<img class="preview-image" src="${report.screenshotBase64}" alt="Captured screenshot">` : `<div class="notice">Screenshot unavailable${report.screenshotError ? `: ${escapeHtml(report.screenshotError)}` : ""}</div>`}
      <div class="section">
        <h3>Steps to Reproduce</h3>
        ${steps.length ? `<ol class="list">${steps.slice(0, 10).map((event) => `<li>${escapeHtml(describeStep(event))}</li>`).join("")}</ol>` : `<p class="muted">No actions captured.</p>`}
      </div>
      ${jsErrors.length ? `
        <div class="section">
          <h3>Detected Errors</h3>
          <div class="code-block">${escapeHtml(jsErrors.map(formatErrorPreview).join("\n\n"))}</div>
        </div>
      ` : ""}
      ${networkErrors.length ? `
        <div class="section">
          <h3>Network Errors</h3>
          <div class="code-block">${escapeHtml(networkErrors.map(formatNetworkErrorPreview).join("\n"))}</div>
        </div>
      ` : ""}
      ${showExplain ? renderAiBlock(report, hasApiKey, aiMessage) : ""}
      <div class="button-row">
        <button class="button button-blue" id="downloadButton">Download Report (.md)</button>
        <button class="button button-light" id="resetButton">Clear & Record Again</button>
      </div>
    </section>
  `;

  document.getElementById("settingsButton").addEventListener("click", openOptions);
  document.getElementById("downloadButton").addEventListener("click", () => downloadReport(activeReport));
  document.getElementById("resetButton").addEventListener("click", resetReport);

  const explainButton = document.getElementById("explainButton");
  if (explainButton) explainButton.addEventListener("click", explainWithAI);
  attachOpenOptionsLink();
}

function renderAiBlock(report, hasApiKey, aiMessage) {
  if (report.aiExplanation) {
    return `
      <div class="ai-box">
        <h3>AI Explain</h3>
        <p>${escapeHtml(report.aiExplanation)}</p>
      </div>
    `;
  }

  return `
    <div class="ai-box">
      <h3>AI Explain</h3>
      ${aiMessage ? `<p class="error">${escapeHtml(aiMessage)}</p>` : `<p class="muted">Dùng Gemini để giải thích lỗi bằng ngôn ngữ dễ hiểu.</p>`}
      <button class="button button-blue" id="explainButton">${hasApiKey ? "Explain with AI" : "Explain with AI"}</button>
      ${hasApiKey ? "" : `<p class="muted">No API key saved. <button class="link-button" id="openOptionsLink">Open Settings</button></p>`}
    </div>
  `;
}

async function startRecording() {
  const button = document.getElementById("startButton");
  button.disabled = true;
  button.textContent = "Starting...";

  const response = await sendMessage({ action: "startRecording" });
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

  const response = await sendMessage({
    action: "explainReport"
  });

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

function buildStartErrorMessage(response) {
  const baseMessage = ERROR_MESSAGES[response?.error] || "Không thể bắt đầu recording.";
  const tabUrl = response?.tabUrl ? `\nTab hiện tại: ${response.tabUrl}` : "";
  return `${baseMessage}${tabUrl}`;
}

function downloadReport(report) {
  const markdown = buildMarkdown(report);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bug-report-${formatFileDate(new Date(report.stoppedAt || Date.now()))}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildMarkdown(report) {
  const events = report.events || [];
  const steps = events.filter((event) => event.type === "click" || event.type === "submit");
  const errors = events.filter((event) => event.type === "jsError");
  const consoleEvents = events.filter((event) => event.type === "console");
  const networkErrors = events.filter((event) => event.type === "networkError");
  const title = report.tabTitle || report.tabUrl || "Unknown Page";

  return `# Bug Report - ${escapeMarkdown(title)}

**Recorded at:** ${formatDateTime(report.startedAt)}
**URL:** ${report.tabUrl || "Unknown"}
**Recording duration:** ${report.durationSeconds || 0} seconds

## Steps to Reproduce
${steps.length ? steps.map((event, index) => `${index + 1}. [${formatTime(event.timestamp)}] ${escapeMarkdown(describeStep(event))}`).join("\n") : "(No user actions captured.)"}

## JavaScript Errors
${errors.length ? fenced(errors.map(formatError).join("\n\n")) : "(No JavaScript errors captured.)"}

## Network Errors
${networkErrors.length ? fenced(networkErrors.map(formatNetworkError).join("\n")) : "(No failed network requests captured.)"}

## Console Log
${consoleEvents.length ? fenced(consoleEvents.map(formatConsoleEvent).join("\n")) : "(No console logs captured.)"}

## Screenshot
${report.screenshotBase64 ? `![screenshot](${report.screenshotBase64})` : `Screenshot unavailable${report.screenshotError ? `: ${report.screenshotError}` : "."}`}
${report.aiExplanation ? `
## Plain-English Explanation
> ${report.aiExplanation.replace(/\n/g, "\n> ")}
` : ""}`;
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message).catch((error) => ({
    ok: false,
    error: error.message || "UNKNOWN_ERROR"
  }));
}

function countEvents(events = []) {
  return events.reduce((counts, event) => {
    if (event.type === "console") {
      counts.console += 1;
      if (event.level === "error") counts.consoleError += 1;
    } else if (Object.prototype.hasOwnProperty.call(counts, event.type)) {
      counts[event.type] += 1;
    }
    return counts;
  }, { console: 0, consoleError: 0, jsError: 0, click: 0, submit: 0, networkError: 0 });
}

function stat(value, label) {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function describeStep(event) {
  const verb = event.type === "submit" ? "Submit form" : "Click";
  const target = event.text || event.selector || "unknown element";
  return `${verb} "${target}" (selector: ${event.selector || "unknown"})`;
}

function formatError(event) {
  const location = event.source ? `\nSource: ${event.source}${event.lineno ? `:${event.lineno}:${event.colno || 0}` : ""}` : "";
  const stack = event.stack ? `\n${event.stack}` : "";
  return `[${formatTime(event.timestamp)}] ${event.message}${location}${stack}`;
}

function formatErrorPreview(event) {
  return truncateForPreview(formatError(event));
}

function formatNetworkError(event) {
  const result = event.statusCode ? `status ${event.statusCode}` : event.error || "request failed";
  return `[${formatTime(event.timestamp)}] ${event.method || "GET"} ${event.url} - ${result}`;
}

function formatNetworkErrorPreview(event) {
  return truncateForPreview(formatNetworkError(event));
}

function formatConsoleEvent(event) {
  return `[${formatTime(event.timestamp)}] ${String(event.level || "log").toUpperCase()}: ${event.message}`;
}

function truncateForPreview(text) {
  const value = String(text ?? "");
  return truncatePreviewTextOnly(value);
}

function truncatePreviewTextOnly(text) {
  const value = String(text ?? "");
  return value.length <= PREVIEW_TEXT_LIMIT
    ? value
    : `${value.slice(0, PREVIEW_TEXT_LIMIT)}\n...`;
}

function formatDuration(startedAt) {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatTime(timestamp) {
  return new Date(timestamp || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatDateTime(timestamp) {
  return new Date(timestamp || Date.now()).toLocaleString();
}

function formatFileDate(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function fenced(text) {
  return "```text\n" + String(text).replace(/```/g, "'''") + "\n```";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
