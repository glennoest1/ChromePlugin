importScripts(
  "shared/dom.js",
  "shared/privacy.js",
  "shared/report.js",
  "background/constants.js",
  "background/privacy.js",
  "background/content-scripts.js",
  "background/state.js",
  "background/replay.js",
  "background/screenshot.js",
  "background/events.js",
  "background/report-builder.js",
  "background/recorder.js",
  "background/report-sharing.js",
  "background/ai.js"
);

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("recordingState").then(({ recordingState }) => {
    if (!recordingState) {
      return chrome.storage.local.set({
        recordingState: { isRecording: false }
      });
    }
    return undefined;
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  recordTabActivation(activeInfo).catch(() => { });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  recordWindowFocusChange(windowId).catch(() => { });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.action) return false;

  runMessageHandler(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error.message || "UNKNOWN_ERROR"
      });
    });

  return true;
});

chrome.webRequest.onCompleted.addListener((details) => {
  if (details.statusCode < 400) return;
  recordNetworkError({
    method: details.method,
    url: details.url,
    statusCode: details.statusCode,
    error: null,
    timestamp: details.timeStamp || Date.now()
  }, details.tabId);
}, { urls: ["<all_urls>"] });

chrome.webRequest.onErrorOccurred.addListener((details) => {
  recordNetworkError({
    method: details.method,
    url: details.url,
    statusCode: null,
    error: details.error || "Network request failed",
    timestamp: details.timeStamp || Date.now()
  }, details.tabId);
}, { urls: ["<all_urls>"] });

async function runMessageHandler(message, sender) {
  switch (message.action) {
    case "startRecording":
      return startRecording(message.mode);
    case "stopRecording":
      return stopRecording();
    case "recordEvent":
      if (!sender.tab?.id) return { ok: true, ignored: true };
      await enqueueAppendEvent(message.payload, sender.tab.id);
      return { ok: true };
    case "prepareReplayForInteraction":
      if (!sender.tab?.id) return { ok: true, ignored: true };
      return startReplayForInteraction(sender.tab.id);
    case "recordReplayEvents":
      if (!sender.tab?.id) return { ok: true, ignored: true };
      await enqueueAppendReplayEvents(message.events, sender.tab.id);
      return { ok: true };
    case "getReplayEvents":
      return getReplayEvents(message.tabId);
    case "getStatus":
      return getStatus();
    case "resetReport":
      await chrome.storage.local.set({
        recordingState: { isRecording: false },
        eventBuffer: [],
        replayEvents: [],
        replayEventsByTab: {},
        replayStatus: null,
        replayStatusByTab: {},
        eventBuffersByTab: {},
        focusedTabsByWindow: {},
        errorScreenshotsByTab: {},
        lastReport: null,
        lastReportShare: null
      });
      return { ok: true };
    case "explainReport":
      return explainLastReport(message.report || null);
    case "shareReport":
      return shareReport(message.report || null);
    case "fetchSharedReport":
      return fetchSharedReport(message.shareId);
    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}
