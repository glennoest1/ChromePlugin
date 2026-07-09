const MAX_EVENTS = 500;
const MAX_REPLAY_EVENTS = 5000;
const MIN_REPLAY_EVENTS = 25;
const REPORT_VERSION = 3;
const ACTION_CORRELATION_WINDOW_MS = 500;
const SPAM_WINDOW_MS = 1000;
const MAX_CAPTURED_BODY_LENGTH = 2000;
const MAX_CAPTURED_HEADER_LENGTH = 500;
const STOP_EVENT_GRACE_MS = 250;
const ERROR_SCREENSHOT_COOLDOWN_MS = 10000;
const RECORDING_MODES = new Set(["activeTab", "allTabs"]);
const ACTION_EVENT_TYPES = new Set(["click", "submit"]);
const CORRELATABLE_EVENT_TYPES = new Set(["console", "network", "networkError"]);
const SENSITIVE_FIELD_PATTERN = /password|token|secret|authorization|cookie|api[-_]?key|session|set-cookie/i;
const STATIC_RESOURCE_PATTERN = /\.(?:avif|bmp|css|gif|ico|jpe?g|js|map|mp3|mp4|otf|png|svg|ttf|webm|webp|woff2?)(?:[?#].*)?$/i;
const NOISY_HOST_PATTERN = /(?:^|\.)((google-analytics|googletagmanager|doubleclick|facebook|hotjar|sentry|segment|mixpanel|clarity|intercom|fullstory)\.com|analytics\.google\.com)$/i;
const GEMINI_MODEL = "gemini-3.1-flash-lite"; // use this models bc it have most request per days
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const AI_PROMPT_FIELD_LIMIT = 3000;

let writeQueue = Promise.resolve();

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

async function recordTabActivation(activeInfo) {
  const { recordingState } = await chrome.storage.local.get("recordingState");
  if (!recordingState?.isRecording) return;

  const timestamp = Date.now();
  const windowId = activeInfo.windowId;
  const previousTabId = recordingState.focusedTabsByWindow?.[String(windowId)];
  if (Number.isFinite(previousTabId) && previousTabId !== activeInfo.tabId) {
    await enqueueAppendEvent({
      type: "tabBlur",
      windowId,
      timestamp
    }, previousTabId);
  }

  if (normalizeRecordingMode(recordingState.mode) === "allTabs") {
    ensureContentScripts(activeInfo.tabId).catch(() => { });
  }

  await enqueueAppendEvent({
    type: "tabFocus",
    windowId,
    timestamp
  }, activeInfo.tabId);
}

async function recordWindowFocusChange(windowId) {
  const { recordingState } = await chrome.storage.local.get("recordingState");
  if (!recordingState?.isRecording) return;

  const timestamp = Date.now();
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await Promise.all(Object.entries(recordingState.focusedTabsByWindow || {}).map(([focusedWindowId, tabId]) =>
      enqueueAppendEvent({
        type: "tabBlur",
        windowId: Number(focusedWindowId),
        timestamp
      }, tabId)
    ));
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, windowId });
  if (!activeTab?.id) return;

  const previousTabId = recordingState.focusedTabsByWindow?.[String(windowId)];
  if (Number.isFinite(previousTabId) && previousTabId !== activeTab.id) {
    await enqueueAppendEvent({
      type: "tabBlur",
      windowId,
      timestamp
    }, previousTabId);
  }

  await enqueueAppendEvent({
    type: "tabFocus",
    windowId,
    timestamp
  }, activeTab.id);
}

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
        lastReport: null
      });
      return { ok: true };
    case "explainReport":
      return explainLastReport(message.report || null);
    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}

async function startRecording(mode = "activeTab") {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "NO_ACTIVE_TAB" };
  }

  const pageInfo = getRecordablePageInfo(tab.url);
  if (!pageInfo.recordable) {
    return { ok: false, error: pageInfo.error, tabUrl: tab.url || "" };
  }

  const contentReady = await ensureContentScripts(tab.id);
  if (!contentReady) {
    return {
      ok: false,
      error: pageInfo.protocol === "file:" ? "FILE_ACCESS_REQUIRED" : "INJECTION_FAILED",
      tabUrl: tab.url || ""
    };
  }

  const now = Date.now();
  const recordingMode = normalizeRecordingMode(mode);
  const tabKey = String(tab.id);
  const recordingState = {
    isRecording: true,
    mode: recordingMode,
    startedAt: now,
    rootTabId: tab.id,
    nextActionSeq: 0,
    focusedTabsByWindow: {
      [String(tab.windowId)]: tab.id
    },
    tabs: {
      [tabKey]: buildTabMetadata(tab, now, {
        isFocused: true,
        focusedAt: now
      })
    }
  };
  const initialFocusEvent = buildBaseEvent({
    type: "tabFocus",
    windowId: tab.windowId,
    timestamp: now
  }, tab.id, recordingState);

  await chrome.storage.local.set({
    recordingState,
    eventBuffer: [initialFocusEvent],
    replayEvents: [],
    replayEventsByTab: {},
    replayStatus: {
      started: false,
      startError: null,
      lastBatchAt: null,
      lastBatchSize: 0,
      storageError: null
    },
    replayStatusByTab: {},
    eventBuffersByTab: {
      [tabKey]: [initialFocusEvent]
    },
    errorScreenshotsByTab: {},
    lastReport: null
  });

  if (recordingMode === "allTabs") {
    ensureRecordersForOpenTabs(tab.id).catch(() => { });
  } else {
    await startReplayForTab(tab.id);
  }

  const { recordingState: latestRecordingState } = await chrome.storage.local.get("recordingState");
  return { ok: true, recordingState: latestRecordingState || recordingState };
}

async function stopRecording() {
  let { recordingState } = await chrome.storage.local.get("recordingState");

  if (!recordingState?.isRecording && !recordingState?.isFinalizing) {
    const { lastReport } = await chrome.storage.local.get("lastReport");
    return { ok: true, report: lastReport || null };
  }

  const stoppedAt = recordingState.stoppedAt || Date.now();
  recordingState = {
    ...recordingState,
    isRecording: false,
    isFinalizing: true,
    stoppedAt
  };
  await chrome.storage.local.set({ recordingState });

  await stopReplayForRecordedTabs(recordingState);
  await wait(150);
  await waitForWriteQueue(5000);
  const stored = await chrome.storage.local.get([
    "recordingState",
    "eventBuffer",
    "eventBuffersByTab",
    "replayEvents",
    "replayEventsByTab",
    "replayStatus",
    "replayStatusByTab",
    "errorScreenshotsByTab"
  ]);
  recordingState = stored.recordingState || recordingState;
  // <<<<<<< Updated upstream
  //   const eventBuffer = stored.eventBuffer || [];
  //   const replayEvents = Array.isArray(stored.replayEvents) ? stored.replayEvents : [];
  //   const replayStatus = stored.replayStatus || null;
  //   const finalized = finalizeRecordingSnapshot(
  //     recordingState,
  //     stored.eventBuffersByTab || {},
  //     stoppedAt
  //   );
  //   recordingState = finalized.recordingState;
  //   const eventBuffersByTab = finalized.eventBuffersByTab;
  // =======
  const eventBuffer = trimEventsByStopTime(stored.eventBuffer || [], stoppedAt);
  const eventBuffersByTab = trimEventBuffersByStopTime(stored.eventBuffersByTab || {}, stoppedAt);
  const reportEvents = getBufferedEvents(eventBuffersByTab);
  const replayEventsByTab = trimReplayEventsByStopTime(
    normalizeReplayEventsByTab(stored.replayEventsByTab, stored.replayEvents),
    stoppedAt
  );
  const replayStatusByTab = stored.replayStatusByTab || {};
  const replayEvents = flattenReplayEventsByTab(replayEventsByTab);
  const replayStatus = buildAggregateReplayStatus(replayStatusByTab, stored.replayStatus);
  const errorScreenshotsByTab = stored.errorScreenshotsByTab || {};
  const hasErrorScreenshots = Object.values(errorScreenshotsByTab).some((screenshot) => screenshot?.dataUrl);
  // >>>>>>> Stashed changes

  await chrome.storage.local.set({
    replayEventsByTab,
    recordingState: {
      ...recordingState,
      isRecording: false,
      isFinalizing: false,
      stoppedAt
    }
  });

  let captureResult = { dataUrl: null, error: null };

  if (!hasErrorScreenshots) {
    try {
      captureResult = await captureTabScreenshot(recordingState.rootTabId);
    } catch (error) {
      captureResult = { dataUrl: null, error: error.message || "Capture failed" };
    }
  }

  const tabs = await buildReportTabs(
    recordingState,
    eventBuffersByTab,
    replayEventsByTab,
    replayStatusByTab,
    errorScreenshotsByTab,
    captureResult
  );
  const summary = buildReportSummary(tabs);
  const reportTabs = stripReplayEventsFromTabs(tabs);
  const report = {
    version: REPORT_VERSION,
    mode: normalizeRecordingMode(recordingState.mode),
    rootTabId: recordingState.rootTabId,
    startedAt: recordingState.startedAt,
    stoppedAt,
    durationSeconds: Math.max(0, Math.round((stoppedAt - recordingState.startedAt) / 1000)),
    events: reportEvents.length ? reportEvents : (Array.isArray(eventBuffer) ? eventBuffer : []),
    replayEventCount: summary.totalReplayEvents || replayEvents.length,
    replayTabs: buildReplayTabs(recordingState, replayEventsByTab, replayStatusByTab),
    replayStatus,
    tabs: reportTabs,
    summary,
    screenshots: buildReportScreenshots(tabs),
    screenshotBase64: getPrimaryScreenshot(tabs)?.dataUrl || captureResult.dataUrl,
    screenshotError: getPrimaryScreenshot(tabs)?.error || captureResult.error,
    aiExplanation: null
  };

  await chrome.storage.local.set({
    lastReport: report
  });

  return { ok: true, report };
}

async function getReplayEvents(tabId = null) {
  const { replayEvents = [], replayEventsByTab = {}, lastReport } =
    await chrome.storage.local.get(["replayEvents", "replayEventsByTab", "lastReport"]);
  const normalizedEventsByTab = trimReplayEventsByStopTime(
    normalizeReplayEventsByTab(
      replayEventsByTab,
      replayEvents,
      lastReport
    ),
    lastReport?.stoppedAt
  );
  const replayTabs = buildStoredReplayTabs(lastReport, normalizedEventsByTab);
  const selectedTabId = tabId === null || tabId === undefined
    ? replayTabs[0]?.tabId
    : Number(tabId);
  const selectedEvents = normalizedEventsByTab[String(selectedTabId)] || [];

  return {
    ok: true,
    replayEvents: selectedEvents,
    replayEventsByTab: normalizedEventsByTab,
    replayTabs,
    selectedTabId,
    timeline: buildReplayTimeline(lastReport, normalizedEventsByTab)
  };
}

async function getStatus() {
  const { recordingState, eventBuffersByTab = {}, lastReport, apiConfig } =
    await chrome.storage.local.get(["recordingState", "eventBuffersByTab", "lastReport", "apiConfig"]);

  return {
    ok: true,
    recordingState: recordingState || { isRecording: false },
    lastReport: lastReport || null,
    counts: countEvents(getBufferedEvents(eventBuffersByTab)),
    hasApiKey: Boolean(apiConfig?.apiKey)
  };
}

async function ensureContentScripts(tabId) {
  const contentReady = await pingContentScript(tabId);
  const replayReady = await pingReplayScript(tabId);
  if (contentReady && replayReady) return true;

  try {
    if (!contentReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["injected.js"],
        world: "MAIN"
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    }

    if (!replayReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["vendor/rrweb.min.js", "session-recorder.js"]
      });
    }
  } catch {
    return false;
  }

  return (await pingContentScript(tabId)) && (await pingReplayScript(tabId));
}

async function ensureRecordersForOpenTabs(rootTabId) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(async (tab) => {
    if (!tab?.id || tab.id === rootTabId) return;
    if (!getRecordablePageInfo(tab.url).recordable) return;
    await ensureContentScripts(tab.id);
  }));
}

function pingContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "bugBlackBoxPing" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(response?.ok));
    });
  });
}

function pingReplayScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "bugBlackBoxReplayPing" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(response?.ok && response?.hasRrweb));
    });
  });
}

function getRecordablePageInfo(url) {
  if (!url) return { recordable: false, protocol: "", error: "UNSUPPORTED_PAGE" };
  try {
    const parsed = new URL(url);
    if (["http:", "https:", "file:"].includes(parsed.protocol)) {
      return { recordable: true, protocol: parsed.protocol };
    }
    return { recordable: false, protocol: parsed.protocol, error: "RESTRICTED_PAGE" };
  } catch {
    return { recordable: false, protocol: "", error: "UNSUPPORTED_PAGE" };
  }
}

function captureVisibleTab(windowId) {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        resolve({
          dataUrl: null,
          error: chrome.runtime.lastError.message || "Unable to capture screenshot"
        });
        return;
      }
      resolve({ dataUrl, error: null });
    });
  });
}

async function captureTabScreenshot(tabId) {
  const targetTab = await chrome.tabs.get(tabId);
  if (!targetTab?.id || targetTab.windowId === undefined) {
    return { dataUrl: null, error: "Root tab is not available; screenshot skipped." };
  }

  const [previousActiveTab] = await chrome.tabs.query({
    active: true,
    windowId: targetTab.windowId
  });

  try {
    if (previousActiveTab?.id !== targetTab.id) {
      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true }).catch(() => { });
      await wait(250);
    }

    return await captureVisibleTab(targetTab.windowId);
  } finally {
    if (previousActiveTab?.id && previousActiveTab.id !== targetTab.id) {
      await chrome.tabs.update(previousActiveTab.id, { active: true }).catch(() => { });
    }
  }
}

async function captureActiveTabScreenshot(tabId) {
  const targetTab = await chrome.tabs.get(tabId).catch(() => null);
  if (!targetTab?.id || targetTab.windowId === undefined) {
    return { dataUrl: null, error: "Tab is not available; screenshot skipped." };
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    windowId: targetTab.windowId
  });

  if (activeTab?.id !== targetTab.id) {
    return { dataUrl: null, error: "Tab is not active; screenshot skipped." };
  }

  return captureVisibleTab(targetTab.windowId);
}

async function maybeCaptureErrorScreenshot(tabId, event) {
  const severity = getScreenshotSeverity(event);
  if (!severity) return;

  const tabKey = String(tabId);
  const { errorScreenshotsByTab = {} } = await chrome.storage.local.get("errorScreenshotsByTab");
  const existing = errorScreenshotsByTab[tabKey] || null;
  const now = Date.now();

  if (existing?.dataUrl) {
    const existingRank = getSeverityRank(existing.severity);
    const nextRank = getSeverityRank(severity);
    const isHigherSeverity = nextRank > existingRank;
    const isCoolingDown = now - Number(existing.capturedAt || 0) < ERROR_SCREENSHOT_COOLDOWN_MS;
    if (!isHigherSeverity || isCoolingDown) return;
  }

  const captureResult = await captureActiveTabScreenshot(tabId);
  if (!captureResult.dataUrl) return;

  const tab = await getTabOrNull(tabId);
  await chrome.storage.local.set({
    errorScreenshotsByTab: {
      ...errorScreenshotsByTab,
      [tabKey]: {
        dataUrl: captureResult.dataUrl,
        error: null,
        reason: "error",
        eventType: event.type,
        severity,
        capturedAt: now,
        url: sanitizeUrl(tab?.url || ""),
        title: tab?.title || ""
      }
    }
  });
}

function shouldCaptureScreenshotForEvent(event) {
  return Boolean(getScreenshotSeverity(event));
}

function getScreenshotSeverity(event) {
  if (event?.type === "jsError") return "jsError";
  if (event?.type === "networkError") return "networkError";
  if (event?.type === "console" && event.level === "error") return "consoleError";
  return null;
}

function getSeverityRank(severity) {
  if (severity === "jsError") return 3;
  if (severity === "networkError") return 2;
  if (severity === "consoleError") return 1;
  return 0;
}

function recordNetworkError(event, tabId) {
  if (typeof tabId !== "number" || tabId < 0) return;
  enqueueAppendEvent({
    type: "networkError",
    method: event.method,
    url: event.url,
    statusCode: event.statusCode,
    error: event.error,
    timestamp: event.timestamp
  }, tabId);
}

function enqueueAppendEvent(rawEvent, tabId) {
  writeQueue = writeQueue.catch(() => { }).then(() => appendEvent(rawEvent, tabId));
  return writeQueue;
}

function enqueueAppendReplayEvents(events, tabId) {
  writeQueue = writeQueue.catch(() => { }).then(() => appendReplayEvents(events, tabId));
  return writeQueue;
}

async function appendEvent(rawEvent, tabId) {
  const { recordingState, eventBuffersByTab = {} } = await chrome.storage.local.get([
    "recordingState",
    "eventBuffersByTab"
  ]);

  if (!shouldAcceptEventAtCurrentStopState(recordingState, event)) return;
  if (!shouldRecordTab(recordingState, tabId)) return;

  const stateWithTab = await ensureRecordedTab(recordingState, tabId);
  if (!stateWithTab) return;

  const tabKey = String(tabId);
  const currentBuffer = Array.isArray(eventBuffersByTab[tabKey])
    ? eventBuffersByTab[tabKey]
    : [];
  const prepared = prepareEvent(rawEvent, tabId, stateWithTab, currentBuffer);
  if (!prepared) return;

  const nextState = applyEventToRecordingState(prepared.recordingState, prepared.event);
  const nextBuffers = {
    ...eventBuffersByTab,
    [tabKey]: [...currentBuffer, prepared.event].slice(-MAX_EVENTS)
  };
  const flatEvents = getBufferedEvents(nextBuffers)
    .sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp))
    .slice(-MAX_EVENTS);

  await chrome.storage.local.set({
    recordingState: nextState,
    eventBuffersByTab: nextBuffers,
    eventBuffer: flatEvents
  });

  if (recordingState.isRecording && shouldCaptureScreenshotForEvent(event)) {
    await maybeCaptureErrorScreenshot(tabId, event);
  }

  if (recordingState.isRecording && shouldStartReplayFromEvent(recordingState, event)) {
    await startReplayForTab(tabId);
  }
}

function normalizeRecordingMode(mode) {
  return RECORDING_MODES.has(mode) ? mode : "activeTab";
}

function shouldRecordTab(recordingState, tabId) {
  if (normalizeRecordingMode(recordingState.mode) === "activeTab") {
    return recordingState.rootTabId === tabId;
  }
  return typeof tabId === "number" && tabId >= 0;
}

async function ensureRecordedTab(recordingState, tabId) {
  const tabKey = String(tabId);
  if (recordingState.tabs?.[tabKey]) return recordingState;

  const tab = await getTabOrNull(tabId);
  if (tab?.url && !getRecordablePageInfo(tab.url).recordable) return null;

  return {
    ...recordingState,
    tabs: {
      ...(recordingState.tabs || {}),
      [tabKey]: buildTabMetadata(tab || { id: tabId }, Date.now())
    }
  };
}

async function buildReportTabs(
  recordingState,
  eventBuffersByTab,
  replayEventsByTab = {},
  replayStatusByTab = {},
  errorScreenshotsByTab = {},
  rootCaptureResult = { dataUrl: null, error: null }
) {
  const tabsById = recordingState.tabs || {};
  const tabKeys = new Set([
    ...Object.keys(tabsById),
    ...Object.keys(eventBuffersByTab || {}),
    ...Object.keys(replayEventsByTab || {})
  ]);

  const tabs = await Promise.all(Array.from(tabKeys).map(async (tabKey) => {
    const storedTab = tabsById[tabKey] || { tabId: Number(tabKey), url: "", title: "" };
    const liveTab = await getTabOrNull(storedTab.tabId);
    const metadata = liveTab ? buildTabMetadata(liveTab, storedTab.startedAt) : storedTab;
    const replayEvents = Array.isArray(replayEventsByTab?.[tabKey]) ? replayEventsByTab[tabKey] : [];
    const isRootTab = metadata.tabId === recordingState.rootTabId;
    const errorScreenshot = errorScreenshotsByTab?.[tabKey] || null;
    const screenshotBase64 = errorScreenshot?.dataUrl || (isRootTab ? rootCaptureResult.dataUrl : null);
    const screenshotError = errorScreenshot?.error || (isRootTab ? rootCaptureResult.error : null);

    return {
      tabId: metadata.tabId,
      url: metadata.url || "",
      title: metadata.title || "",
      events: Array.isArray(eventBuffersByTab?.[tabKey]) ? eventBuffersByTab[tabKey] : [],
      replay: {
        events: replayEvents,
        truncated: Boolean(replayStatusByTab?.[tabKey]?.storageError),
        truncatedReason: replayStatusByTab?.[tabKey]?.storageError || null
      },
      screenshotBase64,
      screenshotError,
      screenshot: screenshotBase64 ? {
        dataUrl: screenshotBase64,
        reason: errorScreenshot?.reason || (isRootTab ? "stopFallback" : null),
        eventType: errorScreenshot?.eventType || null,
        severity: errorScreenshot?.severity || null,
        capturedAt: errorScreenshot?.capturedAt || null,
        error: null
      } : null
    };
  }));

  return tabs.sort((a, b) => {
    if (a.tabId === recordingState.rootTabId) return -1;
    if (b.tabId === recordingState.rootTabId) return 1;
    return a.tabId - b.tabId;
  });
}

function buildTabMetadata(tab, startedAt, focus = {}) {
  const focusedAt = Number.isFinite(focus.focusedAt) ? focus.focusedAt : null;
  return {
    tabId: tab.id,
    url: sanitizeUrl(tab.url || ""),
    title: tab.title || "",
    windowId: numberOrNull(tab.windowId),
    startedAt,
    isFocused: Boolean(focus.isFocused),
    activeRanges: focusedAt ? [{ focusedAt, blurredAt: null }] : []
  };
}

async function getTabOrNull(tabId) {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

function getBufferedEvents(eventBuffersByTab) {
  return Object.values(eventBuffersByTab || {}).flatMap((events) =>
    Array.isArray(events) ? events : []
  );
}

function shouldStartReplayFromEvent(recordingState, event) {
  return normalizeRecordingMode(recordingState.mode) === "allTabs" &&
    (event.type === "click" || event.type === "submit");
}

function shouldAcceptEventAtCurrentStopState(recordingState, event) {
  if (recordingState?.isRecording) return true;
  if (!recordingState?.stoppedAt) return false;

  const timestamp = Number(event?.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= recordingState.stoppedAt + STOP_EVENT_GRACE_MS;
}

function filterEventsAtCurrentStopState(recordingState, events) {
  if (recordingState?.isRecording) return events;
  if (!recordingState?.stoppedAt) return [];

  return events.filter((event) => {
    const timestamp = Number(event?.timestamp);
    return Number.isFinite(timestamp) &&
      timestamp <= recordingState.stoppedAt + STOP_EVENT_GRACE_MS;
  });
}

function trimEventBuffersByStopTime(eventBuffersByTab, stoppedAt) {
  return Object.fromEntries(Object.entries(eventBuffersByTab || {}).map(([tabKey, events]) => [
    tabKey,
    trimEventsByStopTime(events, stoppedAt)
  ]));
}

function trimEventsByStopTime(events, stoppedAt) {
  const stopTime = Number(stoppedAt);
  if (!Number.isFinite(stopTime)) return Array.isArray(events) ? events : [];

  return (Array.isArray(events) ? events : []).filter((event) => {
    const timestamp = Number(event?.timestamp);
    return Number.isFinite(timestamp) && timestamp <= stopTime + STOP_EVENT_GRACE_MS;
  });
}

async function startReplayForInteraction(tabId) {
  const { recordingState } = await chrome.storage.local.get("recordingState");
  if (normalizeRecordingMode(recordingState?.mode) !== "allTabs") {
    return { ok: true, ignored: true };
  }

  return startReplayForTab(tabId);
}

async function appendReplayEvents(events, tabId) {
  if (!Array.isArray(events) || !events.length) return;

  const { recordingState, replayEventsByTab = {} } = await chrome.storage.local.get([
    "recordingState",
    "replayEventsByTab"
  ]);

  if (!recordingState?.isRecording && !recordingState?.stoppedAt) return;
  if (!shouldRecordTab(recordingState, tabId)) return;

  const acceptedEvents = filterEventsAtCurrentStopState(recordingState, events);
  if (!acceptedEvents.length) return;

  const nextState = await ensureRecordedTab(recordingState, tabId);
  if (!nextState) return;

  const tabKey = String(tabId);
  const currentReplayEvents = Array.isArray(replayEventsByTab[tabKey])
    ? replayEventsByTab[tabKey]
    : [];

  const nextReplayEvents = Array.isArray(currentReplayEvents)
    ? [...currentReplayEvents, ...acceptedEvents].slice(-MAX_REPLAY_EVENTS)
    : acceptedEvents.slice(-MAX_REPLAY_EVENTS);
  const nextReplayEventsByTab = {
    ...replayEventsByTab,
    [tabKey]: nextReplayEvents
  };

  const storageResult = await setReplayEventsByTabWithFallback(nextReplayEventsByTab, tabKey);
  await chrome.storage.local.set({
    recordingState: nextState,
    replayStatusByTab: {
      ...(await getReplayStatusByTab()),
      [tabKey]: {
        ...(await getReplayStatus(tabId)),
        started: true,
        lastBatchAt: Date.now(),
        lastBatchSize: acceptedEvents.length,
        storageError: storageResult.ok ? null : storageResult.error
      }
    }
  });
}

function buildReportSummary(tabs) {
  return {
    tabCount: tabs.length,
    totalEvents: tabs.reduce((total, tab) => total + (Array.isArray(tab.events) ? tab.events.length : 0), 0),
    totalReplayEvents: tabs.reduce((total, tab) => total + getTabReplayEvents(tab).length, 0)
  };
}

function stripReplayEventsFromTabs(tabs) {
  return tabs.map((tab) => {
    const replayEvents = getTabReplayEvents(tab);
    return {
      ...tab,
      replay: {
        ...(tab.replay || {}),
        events: [],
        eventCount: replayEvents.length
      }
    };
  });
}

function buildReportScreenshots(tabs) {
  return tabs
    .filter((tab) => tab.screenshotBase64)
    .map((tab) => ({
      tabId: tab.tabId,
      title: tab.title || "",
      url: tab.url || "",
      dataUrl: tab.screenshotBase64,
      reason: tab.screenshot?.reason || null,
      eventType: tab.screenshot?.eventType || null,
      severity: tab.screenshot?.severity || null,
      capturedAt: tab.screenshot?.capturedAt || null
    }));
}

function getPrimaryScreenshot(tabs) {
  const tabWithErrorScreenshot = tabs.find((tab) => tab.screenshotBase64 && tab.screenshot?.reason === "error");
  const tabWithAnyScreenshot = tabs.find((tab) => tab.screenshotBase64);
  if (!tabWithErrorScreenshot && !tabWithAnyScreenshot) return null;

  const tab = tabWithErrorScreenshot || tabWithAnyScreenshot;
  return {
    dataUrl: tab.screenshotBase64,
    error: tab.screenshotError || null
  };
}

function sendTabMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(() => null);
}

async function setReplayEventsWithFallback(events) {
  let nextEvents = events;

  while (nextEvents.length) {
    try {
      await chrome.storage.local.set({ replayEvents: nextEvents });
      return { ok: true };
    } catch (error) {
      if (nextEvents.length < MIN_REPLAY_EVENTS) {
        return {
          ok: false,
          error: error.message || "REPLAY_STORAGE_QUOTA"
        };
      }
      nextEvents = nextEvents.slice(Math.floor(nextEvents.length / 2));
    }
  }

  await chrome.storage.local.set({ replayEvents: [] });
  return { ok: true };
}

async function getReplayStatus(tabId = null) {
  const { replayStatus, replayStatusByTab = {} } =
    await chrome.storage.local.get(["replayStatus", "replayStatusByTab"]);
  if (tabId !== null && tabId !== undefined) {
    return replayStatusByTab[String(tabId)] || defaultReplayStatus();
  }
  return replayStatus || defaultReplayStatus();
}

function defaultReplayStatus() {
  return {
    started: false,
    startError: null,
    lastBatchAt: null,
    lastBatchSize: 0,
    storageError: null
  };
}

async function getReplayStatusByTab() {
  const { replayStatusByTab = {} } = await chrome.storage.local.get("replayStatusByTab");
  return replayStatusByTab;
}

async function setReplayEventsByTabWithFallback(eventsByTab, tabKey) {
  let nextEventsByTab = eventsByTab;

  while (true) {
    try {
      await chrome.storage.local.set({ replayEventsByTab: nextEventsByTab });
      return { ok: true, eventsByTab: nextEventsByTab };
    } catch (error) {
      const currentEvents = nextEventsByTab[tabKey] || [];
      if (currentEvents.length < MIN_REPLAY_EVENTS) {
        const emptiedEventsByTab = {
          ...nextEventsByTab,
          [tabKey]: []
        };
        await chrome.storage.local.set({ replayEventsByTab: emptiedEventsByTab }).catch(() => { });
        return {
          ok: false,
          error: error.message || "REPLAY_STORAGE_QUOTA",
          eventsByTab: emptiedEventsByTab
        };
      }

      nextEventsByTab = {
        ...nextEventsByTab,
        [tabKey]: currentEvents.slice(Math.floor(currentEvents.length / 2))
      };
    }
  }
}

async function startReplayForTab(tabId) {
  const { recordingState } = await chrome.storage.local.get("recordingState");
  if (!recordingState?.isRecording || !shouldRecordTab(recordingState, tabId)) {
    return { ok: true, ignored: true };
  }

  const nextRecordingState = await ensureRecordedTab(recordingState, tabId);
  if (!nextRecordingState) return { ok: true, ignored: true };

  if (nextRecordingState !== recordingState) {
    await chrome.storage.local.set({ recordingState: nextRecordingState });
  }

  const contentReady = await ensureContentScripts(tabId);
  if (!contentReady) {
    await setReplayStartStatus(tabId, {
      started: false,
      startError: "INJECTION_FAILED",
      lastBatchAt: null,
      lastBatchSize: 0,
      storageError: null
    });
    return { ok: false, recording: false, error: "INJECTION_FAILED" };
  }

  const replayStart = await sendTabMessage(tabId, { action: "startSessionReplay" });
  await setReplayStartStatus(tabId, {
    started: Boolean(replayStart?.ok && replayStart?.recording),
    startError: replayStart?.error || null,
    lastBatchAt: null,
    lastBatchSize: 0,
    storageError: null
  });

  return {
    ok: Boolean(replayStart?.ok),
    recording: Boolean(replayStart?.ok && replayStart?.recording),
    error: replayStart?.error || null
  };
}

async function setReplayStartStatus(tabId, nextStatus) {
  const tabKey = String(tabId);
  const { replayStatusByTab = {}, replayEventsByTab = {} } =
    await chrome.storage.local.get(["replayStatusByTab", "replayEventsByTab"]);

  await chrome.storage.local.set({
    replayEventsByTab: {
      ...replayEventsByTab,
      [tabKey]: Array.isArray(replayEventsByTab[tabKey]) ? replayEventsByTab[tabKey] : []
    },
    replayStatusByTab: {
      ...replayStatusByTab,
      [tabKey]: nextStatus
    },
    replayStatus: nextStatus
  });
}

async function stopReplayForRecordedTabs(recordingState) {
  const tabIds = Object.keys(recordingState.tabs || {})
    .map((tabId) => Number(tabId))
    .filter((tabId) => Number.isFinite(tabId));

  if (!tabIds.includes(recordingState.rootTabId)) tabIds.unshift(recordingState.rootTabId);

  await Promise.all(tabIds.map((tabId) =>
    sendTabMessage(tabId, { action: "stopSessionReplay" })
  ));
}

function normalizeReplayEventsByTab(replayEventsByTab, legacyReplayEvents = [], report = null) {
  if (replayEventsByTab && typeof replayEventsByTab === "object" && Object.keys(replayEventsByTab).length) {
    return replayEventsByTab;
  }

  const reportEventsByTab = getReportReplayEventsByTab(report);
  if (Object.keys(reportEventsByTab).length) {
    return reportEventsByTab;
  }

  if (Array.isArray(legacyReplayEvents) && legacyReplayEvents.length) {
    return { 0: legacyReplayEvents };
  }

  return {};
}

function trimReplayEventsByStopTime(replayEventsByTab, stoppedAt) {
  const stopTime = Number(stoppedAt);
  if (!Number.isFinite(stopTime)) return replayEventsByTab || {};

  return Object.fromEntries(Object.entries(replayEventsByTab || {}).map(([tabKey, events]) => [
    tabKey,
    (Array.isArray(events) ? events : []).filter((event) => {
      const timestamp = Number(event?.timestamp);
      return Number.isFinite(timestamp) && timestamp <= stopTime + STOP_EVENT_GRACE_MS;
    })
  ]));
}

function flattenReplayEventsByTab(replayEventsByTab) {
  return Object.values(replayEventsByTab || {}).flatMap((events) =>
    Array.isArray(events) ? events : []
  );
}

function buildReplayTabs(recordingState, replayEventsByTab, replayStatusByTab) {
  return Object.entries(replayEventsByTab || {}).map(([tabKey, events]) => {
    const metadata = recordingState.tabs?.[tabKey] || { tabId: Number(tabKey), title: "", url: "" };
    return {
      tabId: Number(tabKey),
      title: metadata.title || "",
      url: metadata.url || "",
      eventCount: Array.isArray(events) ? events.length : 0,
      status: replayStatusByTab?.[tabKey] || null
    };
  }).sort((a, b) => {
    if (a.tabId === recordingState.rootTabId) return -1;
    if (b.tabId === recordingState.rootTabId) return 1;
    return a.tabId - b.tabId;
  });
}

function buildStoredReplayTabs(lastReport, replayEventsByTab) {
  const reportTabsById = new Map((lastReport?.tabs || []).map((tab) => [String(tab.tabId), tab]));
  const reportReplayTabsById = new Map((lastReport?.replayTabs || []).map((tab) => [String(tab.tabId), tab]));

  return Object.entries(replayEventsByTab || {}).map(([tabKey, events]) => {
    const reportTab = reportTabsById.get(tabKey) || reportReplayTabsById.get(tabKey) || {};
    return {
      tabId: Number(tabKey),
      title: reportTab.title || "",
      url: reportTab.url || "",
      eventCount: Array.isArray(events) ? events.length : 0
    };
  }).filter((tab) => tab.eventCount > 0).sort((a, b) => {
    if (a.tabId === lastReport?.rootTabId) return -1;
    if (b.tabId === lastReport?.rootTabId) return 1;
    return a.tabId - b.tabId;
  });
}

function getReportReplayEventsByTab(report) {
  if (!Array.isArray(report?.tabs)) return {};

  return report.tabs.reduce((eventsByTab, tab) => {
    const events = getTabReplayEvents(tab);
    if (events.length) {
      eventsByTab[String(tab.tabId)] = events;
    }
    return eventsByTab;
  }, {});
}

function getTabReplayEvents(tab) {
  if (Array.isArray(tab?.replay?.events)) return tab.replay.events;
  if (Array.isArray(tab?.replayEvents)) return tab.replayEvents;
  return [];
}

function buildReplayTimeline(report, replayEventsByTab) {
  const reportTabsById = new Map((report?.tabs || []).map((tab) => [String(tab.tabId), tab]));
  const actions = (report?.tabs || []).flatMap((tab) =>
    (tab.events || [])
      .filter((event) => event.type === "click" || event.type === "submit")
      .map((event) => ({
        tabId: tab.tabId,
        timestamp: event.timestamp || 0
      }))
  ).sort((a, b) => a.timestamp - b.timestamp);

  const replayTabKeys = Object.keys(replayEventsByTab || {}).filter((tabKey) =>
    Array.isArray(replayEventsByTab[tabKey]) && replayEventsByTab[tabKey].length > 1
  );

  const replayAnchors = actions.filter((action) =>
    replayEventsByTab[String(action.tabId)]?.length > 1
  );
  const actionTabKeys = new Set(replayAnchors.map((action) => String(action.tabId)));

  replayTabKeys.forEach((tabKey) => {
    if (actionTabKeys.has(tabKey)) return;
    const events = replayEventsByTab[tabKey];
    replayAnchors.push({
      tabId: Number(tabKey),
      timestamp: events[0].timestamp,
      synthetic: true
    });
  });

  const sortedAnchors = replayAnchors
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((anchor, index, anchors) => index === 0 || anchors[index - 1].tabId !== anchor.tabId);

  const segmentStarts = sortedAnchors.map((anchor, index, anchors) => {
    const tabKey = String(anchor.tabId);
    const events = replayEventsByTab[tabKey];
    const replayStart = events[0].timestamp;
    const hasEarlierSameTab = anchors.slice(0, index).some((previous) => previous.tabId === anchor.tabId);

    return {
      ...anchor,
      start: hasEarlierSameTab ? Math.max(replayStart, anchor.timestamp || replayStart) : replayStart
    };
  });

  const segments = [];
  for (let index = 0; index < segmentStarts.length; index += 1) {
    const anchor = segmentStarts[index];
    const tabKey = String(anchor.tabId);
    const events = replayEventsByTab[tabKey];
    if (!Array.isArray(events) || events.length < 2) continue;

    const replayEnd = events[events.length - 1].timestamp;
    const nextStart = segmentStarts[index + 1]?.start || replayEnd;
    const start = Math.max(events[0].timestamp, anchor.start);
    const end = Math.min(replayEnd, nextStart);
    if (end <= start) continue;

    const previous = segments[segments.length - 1];
    if (previous?.tabId === anchor.tabId && previous.end >= start) {
      previous.end = Math.max(previous.end, end);
      continue;
    }

    const tab = reportTabsById.get(tabKey) || {};
    segments.push({
      tabId: anchor.tabId,
      title: tab.title || "",
      url: tab.url || "",
      start,
      end
    });
  }

  return segments;
}

function buildAggregateReplayStatus(replayStatusByTab, legacyReplayStatus) {
  const statuses = Object.values(replayStatusByTab || {});
  if (!statuses.length) return legacyReplayStatus || null;

  return {
    started: statuses.some((status) => status.started),
    startError: statuses.find((status) => status.startError)?.startError || null,
    lastBatchAt: Math.max(0, ...statuses.map((status) => status.lastBatchAt || 0)) || null,
    lastBatchSize: statuses.reduce((total, status) => total + (status.lastBatchSize || 0), 0),
    storageError: statuses.find((status) => status.storageError)?.storageError || null
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function waitForWriteQueue(timeoutMs) {
  return Promise.race([
    writeQueue.catch(() => { }),
    wait(timeoutMs)
  ]);
}

function sanitizeEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") return null;

  const timestamp = Number.isFinite(rawEvent.timestamp)
    ? rawEvent.timestamp
    : Date.now();

  if (rawEvent.type === "tabFocus" || rawEvent.type === "tabBlur") {
    return {
      type: rawEvent.type,
      windowId: numberOrNull(rawEvent.windowId),
      timestamp
    };
  }

  if (rawEvent.type === "console") {
    const allowedLevel = ["log", "warn", "error"].includes(rawEvent.level)
      ? rawEvent.level
      : "log";
    return {
      type: "console",
      level: allowedLevel,
      message: stringifyValue(rawEvent.message),
      timestamp
    };
  }

  if (rawEvent.type === "click" || rawEvent.type === "submit") {
    return {
      type: rawEvent.type,
      selector: stringifyValue(rawEvent.selector),
      text: stringifyValue(rawEvent.text),
      timestamp
    };
  }

  if (rawEvent.type === "jsError") {
    return {
      type: "jsError",
      message: stringifyValue(rawEvent.message),
      source: sanitizeUrl(rawEvent.source || ""),
      lineno: numberOrNull(rawEvent.lineno),
      colno: numberOrNull(rawEvent.colno),
      stack: stringifyValue(rawEvent.stack || ""),
      timestamp
    };
  }

  if (rawEvent.type === "network") {
    return {
      type: "network",
      source: stringifyValue(rawEvent.source || ""),
      method: stringifyValue(rawEvent.method || "GET").toUpperCase(),
      url: sanitizeUrl(rawEvent.url || ""),
      requestHeaders: sanitizeHeaders(rawEvent.requestHeaders),
      requestBody: sanitizePayload(rawEvent.requestBody),
      responseHeaders: sanitizeHeaders(rawEvent.responseHeaders),
      responseBody: sanitizePayload(rawEvent.responseBody),
      statusCode: numberOrNull(rawEvent.statusCode),
      durationMs: numberOrNull(rawEvent.durationMs),
      error: stringifyValue(rawEvent.error || ""),
      timestamp
    };
  }

  if (rawEvent.type === "networkError") {
    return {
      type: "networkError",
      method: stringifyValue(rawEvent.method || "GET"),
      url: sanitizeUrl(rawEvent.url || ""),
      requestHeaders: sanitizeHeaders(rawEvent.requestHeaders),
      requestBody: sanitizePayload(rawEvent.requestBody),
      responseHeaders: sanitizeHeaders(rawEvent.responseHeaders),
      responseBody: sanitizePayload(rawEvent.responseBody),
      statusCode: numberOrNull(rawEvent.statusCode),
      durationMs: numberOrNull(rawEvent.durationMs),
      error: stringifyValue(rawEvent.error || ""),
      timestamp
    };
  }

  return null;
}

function prepareEvent(rawEvent, tabId, recordingState, currentBuffer) {
  const sanitizedEvent = sanitizeEvent(rawEvent);
  if (!sanitizedEvent) return null;

  let nextState = recordingState;
  const event = buildBaseEvent(sanitizedEvent, tabId, recordingState);

  if (ACTION_EVENT_TYPES.has(event.type)) {
    const actionSeq = Number(recordingState.nextActionSeq || 0) + 1;
    event.eventId = stringifyValue(rawEvent.eventId || `action-${recordingState.startedAt}-${actionSeq}`);
    applySpamMetadata(event, currentBuffer);
    nextState = {
      ...recordingState,
      nextActionSeq: actionSeq
    };
  }

  if (CORRELATABLE_EVENT_TYPES.has(event.type)) {
    const action = findRecentAction(currentBuffer, event.timestamp);
    if (action?.eventId) event.triggeredByActionId = action.eventId;
  }

  if (event.type === "console" && !shouldKeepConsoleEvent(event)) {
    return null;
  }

  if (event.type === "network" && !shouldKeepNetworkEvent(event)) {
    return null;
  }

  return {
    event,
    recordingState: nextState
  };
}

function buildBaseEvent(event, tabId, recordingState) {
  const timestamp = normalizeTimestamp(event.timestamp);
  return {
    ...event,
    tabId,
    timestamp,
    relativeTime: getRelativeTime(timestamp, recordingState.startedAt)
  };
}

function applySpamMetadata(event, currentBuffer) {
  if (!event.selector) return;

  let spamCount = 1;
  for (let index = currentBuffer.length - 1; index >= 0; index -= 1) {
    const previousEvent = currentBuffer[index];
    if (!ACTION_EVENT_TYPES.has(previousEvent?.type)) continue;
    if (event.timestamp - normalizeTimestamp(previousEvent.timestamp) > SPAM_WINDOW_MS) break;
    if (previousEvent.selector !== event.selector) break;
    spamCount += 1;
  }

  if (spamCount >= 3) {
    event.isSpam = true;
    event.spamCount = spamCount;
  }
}

function findRecentAction(events, timestamp) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!ACTION_EVENT_TYPES.has(event?.type)) continue;
    const elapsed = timestamp - normalizeTimestamp(event.timestamp);
    if (elapsed < 0) continue;
    if (elapsed <= ACTION_CORRELATION_WINDOW_MS) return event;
    return null;
  }
  return null;
}

function shouldKeepNetworkEvent(event) {
  const statusCode = Number(event.statusCode);
  const method = stringifyValue(event.method || "GET").toUpperCase();

  if (event.triggeredByActionId) return true;
  if (event.error) return true;
  if (Number.isFinite(statusCode) && statusCode >= 400) return true;
  if (method !== "GET" && method !== "HEAD") return true;
  if (event.requestBody) return true;
  if (isNoisyNetworkUrl(event.url)) return false;

  return false;
}

function shouldKeepConsoleEvent(event) {
  if (event.level === "error" || event.level === "warn") return true;
  return Boolean(event.triggeredByActionId);
}

function isNoisyNetworkUrl(url) {
  const value = stringifyValue(url);
  if (!value) return true;
  if (/^(?:chrome|chrome-extension|moz-extension|edge|about|data|blob):/i.test(value)) return true;

  try {
    const parsed = new URL(value);
    if (STATIC_RESOURCE_PATTERN.test(parsed.pathname)) return true;
    if (NOISY_HOST_PATTERN.test(parsed.hostname)) return true;
  } catch {
    return STATIC_RESOURCE_PATTERN.test(value);
  }

  return false;
}

function applyEventToRecordingState(recordingState, event) {
  if (event.type !== "tabFocus" && event.type !== "tabBlur") return recordingState;

  const tabKey = String(event.tabId);
  const tab = recordingState.tabs?.[tabKey];
  if (!tab) return recordingState;
  const windowId = Number.isFinite(event.windowId) ? event.windowId : tab.windowId;
  const focusedTabsByWindow = updateFocusedTabsByWindow(
    recordingState.focusedTabsByWindow,
    event.type,
    windowId,
    event.tabId
  );

  return {
    ...recordingState,
    focusedTabsByWindow,
    tabs: {
      ...(recordingState.tabs || {}),
      [tabKey]: event.type === "tabFocus"
        ? markTabFocused(tab, event.timestamp)
        : markTabBlurred(tab, event.timestamp)
    }
  };
}

function updateFocusedTabsByWindow(currentFocusedTabs, eventType, windowId, tabId) {
  if (!Number.isFinite(windowId)) return currentFocusedTabs || {};

  const windowKey = String(windowId);
  const nextFocusedTabs = { ...(currentFocusedTabs || {}) };
  if (eventType === "tabFocus") {
    nextFocusedTabs[windowKey] = tabId;
  } else if (nextFocusedTabs[windowKey] === tabId) {
    delete nextFocusedTabs[windowKey];
  }
  return nextFocusedTabs;
}

function markTabFocused(tab, timestamp) {
  if (tab.isFocused) return tab;

  return {
    ...tab,
    isFocused: true,
    activeRanges: [
      ...normalizeActiveRanges(tab.activeRanges),
      { focusedAt: timestamp, blurredAt: null }
    ]
  };
}

function markTabBlurred(tab, timestamp) {
  if (!tab.isFocused) return tab;

  const activeRanges = normalizeActiveRanges(tab.activeRanges);
  const rangeIndex = activeRanges.length - 1;
  const nextRanges = rangeIndex >= 0
    ? activeRanges.map((range, index) => index === rangeIndex && range.blurredAt === null
      ? { ...range, blurredAt: timestamp }
      : range)
    : [{ focusedAt: tab.startedAt || timestamp, blurredAt: timestamp }];

  return {
    ...tab,
    isFocused: false,
    activeRanges: nextRanges
  };
}

function normalizeActiveRanges(ranges) {
  return (Array.isArray(ranges) ? ranges : [])
    .map((range) => ({
      focusedAt: numberOrNull(range?.focusedAt),
      blurredAt: numberOrNull(range?.blurredAt)
    }))
    .filter((range) => Number.isFinite(range.focusedAt));
}

function finalizeRecordingSnapshot(recordingState, eventBuffersByTab, stoppedAt) {
  let nextState = recordingState;
  let nextBuffers = eventBuffersByTab || {};

  for (const tab of Object.values(recordingState.tabs || {})) {
    if (!tab?.isFocused) continue;
    const blurEvent = buildBaseEvent({
      type: "tabBlur",
      windowId: tab.windowId,
      timestamp: stoppedAt
    }, tab.tabId, recordingState);
    nextState = applyEventToRecordingState(nextState, blurEvent);
    const tabKey = String(tab.tabId);
    const currentBuffer = Array.isArray(nextBuffers[tabKey]) ? nextBuffers[tabKey] : [];
    nextBuffers = {
      ...nextBuffers,
      [tabKey]: [...currentBuffer, blurEvent].slice(-MAX_EVENTS)
    };
  }

  return {
    recordingState: nextState,
    eventBuffersByTab: nextBuffers
  };
}

function flattenTabEvents(tabs) {
  return (Array.isArray(tabs) ? tabs : [])
    .flatMap((tab) => (Array.isArray(tab.events) ? tab.events : []))
    .sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp));
}

function buildGlobalTimeline(tabs) {
  return (Array.isArray(tabs) ? tabs : [])
    .flatMap((tab) => (Array.isArray(tab.events) ? tab.events : [])
      .map((event, eventIndex) => ({
        timestamp: normalizeTimestamp(event.timestamp),
        relativeTime: numberOrNull(event.relativeTime),
        tabId: tab.tabId,
        eventIndex
      })))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function addRelativeTimeToReplayEvents(events, startedAt) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => event && typeof event === "object")
    .map((event) => {
      const timestamp = normalizeTimestamp(event.timestamp);
      return {
        ...event,
        timestamp,
        relativeTime: getRelativeTime(timestamp, startedAt)
      };
    });
}

function getRelativeTime(timestamp, startedAt) {
  return Math.max(0, normalizeTimestamp(timestamp) - normalizeTimestamp(startedAt));
}

function normalizeTimestamp(value) {
  return Number.isFinite(Number(value)) ? Number(value) : Date.now();
}

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};

  return Object.entries(headers).reduce((result, [key, value]) => {
    const headerName = stringifyValue(key).toLowerCase();
    if (!headerName) return result;
    result[headerName] = SENSITIVE_FIELD_PATTERN.test(headerName)
      ? "[redacted]"
      : limitText(redactSensitiveText(stringifyValue(value)), MAX_CAPTURED_HEADER_LENGTH);
    return result;
  }, {});
}

function sanitizePayload(value) {
  if (value === undefined || value === null || value === "") return "";
  return limitText(redactSensitiveText(stringifyValue(value)), MAX_CAPTURED_BODY_LENGTH);
}

function redactSensitiveText(text) {
  return String(text)
    .replace(/((?:password|token|secret|authorization|cookie|api[-_]?key|session)\s*[:=]\s*)([^\s,;&]+)/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]");
}

function limitText(value, maxLength) {
  const text = stringifyValue(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function countEvents(events) {
  const counts = {
    console: 0,
    consoleError: 0,
    jsError: 0,
    click: 0,
    submit: 0,
    network: 0,
    networkError: 0
  };

  for (const event of Array.isArray(events) ? events : []) {
    if (event.type === "console") {
      counts.console += 1;
      if (event.level === "error") counts.consoleError += 1;
    } else if (Object.prototype.hasOwnProperty.call(counts, event.type)) {
      counts[event.type] += 1;
    }
  }

  return counts;
}

async function explainLastReport(reportFromPopup) {
  const { apiConfig, lastReport } = await chrome.storage.local.get(["apiConfig", "lastReport"]);
  const report = reportFromPopup || lastReport;
  const events = getReportEvents(report);

  if (!apiConfig?.apiKey) throw new Error("MISSING_API_KEY");
  if (!events.length) throw new Error("EMPTY_REPORT");
  if (!hasExplainableError(report)) throw new Error("NO_ERRORS");

  const explanation = await explainWithAI(apiConfig.apiKey, report);
  const updatedReport = {
    ...report,
    aiExplanation: explanation
  };

  await chrome.storage.local.set({ lastReport: updatedReport });
  return { ok: true, explanation, report: updatedReport };
}

function hasExplainableError(report) {
  return getReportEvents(report).some((event) =>
    event.type === "jsError" ||
    (event.type === "console" && event.level === "error")
  );
}

async function explainWithAI(apiKey, report) {
  const prompt = buildExplainPrompt(report);
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      maxOutputTokens: 30000,
      temperature: 0.2
    }
  };
  let response;

  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
  } catch {
    throw new Error("NETWORK_ERROR");
  }

  if (response.status === 401 || response.status === 403) throw new Error("INVALID_API_KEY");
  if (response.status === 429) throw new Error("RATE_LIMIT");
  if (!response.ok) throw new Error("UNKNOWN_ERROR");

  const data = await response.json();

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("EMPTY_RESPONSE");

  return text;
}

function buildExplainPrompt(report) {
  const events = getReportEvents(report);
  const errors = events
    .filter((event) => event.type === "jsError")
    .map((event) => `- ${limitForAI(event.message)}${event.stack ? "\n  Stack: " + limitForAI(event.stack) : ""}`)
    .join("\n");

  const consoleErrors = events
    .filter((event) => event.type === "console" && event.level === "error")
    .map((event) => `- ${limitForAI(event.message)}`)
    .join("\n");

  const networkErrors = events
    .filter((event) => event.type === "networkError" || (event.type === "network" && (event.error || Number(event.statusCode) >= 400)))
    .map((event) => `- ${event.method} ${limitForAI(event.url)} ${event.statusCode ? "status " + event.statusCode : limitForAI(event.error)}${event.responseBody ? " response: " + limitForAI(event.responseBody) : ""}`)
    .join("\n");

  const steps = events
    .filter((event) => event.type === "click" || event.type === "submit")
    .map((event, index) => `${index + 1}. ${event.type === "submit" ? "Submitted" : "Clicked"} "${event.text || event.selector}"`)
    .join("\n");

  return `Bạn là trợ lý debug giúp giải thích lỗi kỹ thuật bằng ngôn ngữ đơn giản cho PM, QA hoặc người không chuyên sâu kỹ thuật.
Dựa trên thông tin bên dưới, hãy viết một đoạn giải thích ngắn 3-5 câu bằng tiếng Việt về chuyện gì đã xảy ra.
Không lặp lại nguyên văn log, không thêm tiêu đề, và tập trung vào nguyên nhân ở mức khái niệm.

Các bước người dùng đã thao tác:
${steps || "(không có dữ liệu)"}

Lỗi JavaScript phát hiện được:
${errors || "(không có lỗi JS)"}

Console error khác:
${consoleErrors || "(không có)"}

Network request lỗi:
${networkErrors || "(không có)"}

Chỉ trả lời đoạn giải thích.`;
}

function getReportEvents(report) {
  if (Array.isArray(report?.events) && report.events.length) return report.events;
  return (report?.tabs || []).flatMap((tab) => Array.isArray(tab.events) ? tab.events : []);
}

function sanitizeUrl(value) {
  const text = String(value || "");
  if (!text) return "";

  try {
    const url = new URL(text);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/password|token|secret|authorization|cookie|api[-_]?key|session/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.toString();
  } catch {
    return text.split("#")[0];
  }
}

function stringifyValue(value) {
  return String(value ?? "");
}

function limitForAI(value) {
  const text = stringifyValue(value);
  if (text.length <= AI_PROMPT_FIELD_LIMIT) return text;
  return `${text.slice(0, AI_PROMPT_FIELD_LIMIT)}\n...`;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}
