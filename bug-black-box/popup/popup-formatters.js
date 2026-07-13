var PREVIEW_TEXT_LIMIT = 1600;
var MODE_LABELS = {};

function updateModeLabels() {
  MODE_LABELS.activeTab = bbbT("currentTab");
  MODE_LABELS.allTabs = bbbT("allTabs");
}

document.addEventListener("bbb-language-ready", updateModeLabels);

function getReplayStatusText(report) {
  const replayEventCount = getTotalReplayEvents(report);
  const replayTabCount = Array.isArray(report.replayTabs)
    ? report.replayTabs.filter((tab) => Number(tab.eventCount || 0) > 0).length
    : getReportTabs(report).filter((tab) => getTabReplayEventCount(tab) > 0).length;
  if (replayEventCount) {
    return replayTabCount > 1
      ? `${replayEventCount} ${bbbT("replayEvents").toLowerCase()} / ${replayTabCount} ${bbbT("tabs").toLowerCase()}`
      : `${replayEventCount} ${bbbT("replayEvents").toLowerCase()}`;
  }

  const status = report.replayStatus || {};
  if (status.storageError) return bbbT("notCapturedWithReason", { reason: status.storageError });
  if (status.startError) return bbbT("notCapturedWithReason", { reason: status.startError });
  if (status.started === false) return bbbT("notCapturedRecorder");
  if (status.lastBatchAt && !replayEventCount) return bbbT("notCapturedZero");
  return bbbT("notCaptured");
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
  }, { console: 0, consoleError: 0, jsError: 0, click: 0, submit: 0, network: 0, networkError: 0 });
}

function getRecordingTabs(recordingState) {
  return Object.values(recordingState?.tabs || {}).sort((a, b) => {
    if (a.tabId === recordingState.rootTabId) return -1;
    if (b.tabId === recordingState.rootTabId) return 1;
    return a.tabId - b.tabId;
  });
}

function normalizeMode(mode) {
  return mode === "allTabs" ? "allTabs" : "activeTab";
}

function describeStep(event) {
  const verb = event.type === "submit" ? bbbT("submit") : bbbT("click");
  const target = event.text || event.selector || bbbT("unknownElement");
  return `${verb} "${target}" (selector: ${event.selector || bbbT("unknownElement")})`;
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

function formatNetworkRequest(event) {
  const status = event.statusCode ? `status ${event.statusCode}` : event.error || "pending/failed";
  const duration = Number.isFinite(event.durationMs) ? ` in ${event.durationMs}ms` : "";
  const action = event.triggeredByActionId ? `\nTriggered by: ${event.triggeredByActionId}` : "";
  const requestBody = event.requestBody ? `\nRequest body: ${event.requestBody}` : "";
  const responseBody = event.responseBody ? `\nResponse body: ${event.responseBody}` : "";
  return `[${formatTime(event.timestamp)}] ${event.method || "GET"} ${event.url} - ${status}${duration}${action}${requestBody}${responseBody}`;
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

function formatScreenshotMeta(screenshot) {
  const reason = screenshot.reason === "error"
    ? bbbT("capturedAtError", { reason: formatScreenshotReason(screenshot.severity || screenshot.eventType) })
    : screenshot.reason === "stopFallback"
      ? bbbT("capturedOnStop")
      : bbbT("capturedDuring");
  const time = screenshot.capturedAt ? ` - ${formatTime(screenshot.capturedAt)}` : "";
  return `${reason}${time}`;
}

function formatScreenshotReason(reason) {
  if (reason === "jsError") return bbbT("javascriptError");
  if (reason === "consoleError") return bbbT("consoleError");
  if (reason === "networkError") return bbbT("networkErrorReason");
  return bbbT("error");
}
