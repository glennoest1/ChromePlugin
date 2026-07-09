const MAX_EVENTS = 500;
const MAX_REPLAY_EVENTS = 5000;
const MIN_REPLAY_EVENTS = 25;
const REPORT_VERSION = 3;
const ACTION_CORRELATION_WINDOW_MS = 500;
const SPAM_WINDOW_MS = 1000;
const MAX_CAPTURED_BODY_LENGTH = 2000;
const MAX_CAPTURED_HEADER_LENGTH = 500;
const RECORDING_MODES = new Set(["activeTab", "allTabs"]);
const ACTION_EVENT_TYPES = new Set(["click", "submit"]);
const CORRELATABLE_EVENT_TYPES = new Set(["console", "network", "networkError"]);
const SENSITIVE_FIELD_PATTERN = /password|token|secret|authorization|cookie|api[-_]?key|session|set-cookie/i;
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
    case "recordReplayEvents":
      if (!sender.tab?.id) return { ok: true, ignored: true };
      await enqueueAppendReplayEvents(message.events, sender.tab.id);
      return { ok: true };
    case "getReplayEvents":
      return getReplayEvents();
    case "getStatus":
      return getStatus();
    case "resetReport":
      await chrome.storage.local.set({
        recordingState: { isRecording: false },
        eventBuffer: [],
        replayEvents: [],
        replayStatus: null,
        eventBuffersByTab: {},
        focusedTabsByWindow: {},
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
    replayStatus: {
      started: false,
      startError: null,
      lastBatchAt: null,
      lastBatchSize: 0,
      storageError: null
    },
    eventBuffersByTab: {
      [tabKey]: [initialFocusEvent]
    },
    lastReport: null
  });

  const replayStart = await sendTabMessage(tab.id, { action: "startSessionReplay" });
  await chrome.storage.local.set({
    replayStatus: {
      started: Boolean(replayStart?.ok && replayStart?.recording),
      startError: replayStart?.error || null,
      lastBatchAt: null,
      lastBatchSize: 0,
      storageError: null
    }
  });
  if (recordingMode === "allTabs") {
    ensureRecordersForOpenTabs(tab.id).catch(() => { });
  }

  return { ok: true, recordingState };
}

async function stopRecording() {
  let { recordingState } = await chrome.storage.local.get("recordingState");

  if (!recordingState?.isRecording) {
    const { lastReport } = await chrome.storage.local.get("lastReport");
    return { ok: true, report: lastReport || null };
  }

  const stoppedAt = Date.now();
  await sendTabMessage(recordingState.rootTabId, { action: "stopSessionReplay" });
  await wait(150);
  await writeQueue.catch(() => { });
  const stored = await chrome.storage.local.get([
    "recordingState",
    "eventBuffer",
    "eventBuffersByTab",
    "replayEvents",
    "replayStatus"
  ]);
  recordingState = stored.recordingState || recordingState;
  const eventBuffer = stored.eventBuffer || [];
  const replayEvents = Array.isArray(stored.replayEvents) ? stored.replayEvents : [];
  const replayStatus = stored.replayStatus || null;
  const finalized = finalizeRecordingSnapshot(
    recordingState,
    stored.eventBuffersByTab || {},
    stoppedAt
  );
  recordingState = finalized.recordingState;
  const eventBuffersByTab = finalized.eventBuffersByTab;

  await chrome.storage.local.set({
    recordingState: {
      ...recordingState,
      isRecording: false,
      stoppedAt
    }
  });

  const captureResult = await captureRootTabScreenshot(recordingState.rootTabId);

  const tabs = await buildReportTabs(recordingState, eventBuffersByTab);
  const flattenedEvents = flattenTabEvents(tabs);
  const replayEventsWithRelativeTime = addRelativeTimeToReplayEvents(replayEvents, recordingState.startedAt);
  const report = {
    version: REPORT_VERSION,
    mode: normalizeRecordingMode(recordingState.mode),
    rootTabId: recordingState.rootTabId,
    startedAt: recordingState.startedAt,
    stoppedAt,
    durationSeconds: Math.max(0, Math.round((stoppedAt - recordingState.startedAt) / 1000)),
    events: flattenedEvents.length ? flattenedEvents : (Array.isArray(eventBuffer) ? eventBuffer : []),
    globalTimeline: buildGlobalTimeline(tabs),
    replayEvents: replayEventsWithRelativeTime,
    replayEventCount: replayEventsWithRelativeTime.length,
    replayStatus,
    tabs,
    screenshotBase64: captureResult.dataUrl,
    screenshotError: captureResult.error,
    aiExplanation: null
  };

  await chrome.storage.local.set({
    lastReport: report
  });

  return { ok: true, report };
}

async function getReplayEvents() {
  const { replayEvents = [] } = await chrome.storage.local.get("replayEvents");
  return {
    ok: true,
    replayEvents: Array.isArray(replayEvents) ? replayEvents : []
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

async function captureRootTabScreenshot(rootTabId) {
  try {
    const rootTab = await chrome.tabs.get(rootTabId);
    if (!rootTab?.id || rootTab.windowId === undefined) {
      return { dataUrl: null, error: "Root tab is no longer available." };
    }

    const [previousActiveTab] = await chrome.tabs.query({
      active: true,
      windowId: rootTab.windowId
    });
    const shouldRestoreActiveTab = previousActiveTab?.id &&
      previousActiveTab.id !== rootTab.id;

    if (shouldRestoreActiveTab) {
      await chrome.tabs.update(rootTab.id, { active: true });
      await wait(120);
    }

    const captureResult = await captureVisibleTab(rootTab.windowId);

    if (shouldRestoreActiveTab) {
      chrome.tabs.update(previousActiveTab.id, { active: true }).catch(() => { });
    }

    return captureResult;
  } catch (error) {
    return { dataUrl: null, error: error.message || "Capture failed" };
  }
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

  if (!recordingState?.isRecording) return;
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

async function buildReportTabs(recordingState, eventBuffersByTab) {
  const tabsById = recordingState.tabs || {};
  const tabKeys = new Set([
    ...Object.keys(tabsById),
    ...Object.keys(eventBuffersByTab || {})
  ]);

  const tabs = await Promise.all(Array.from(tabKeys).map(async (tabKey) => {
    const storedTab = tabsById[tabKey] || { tabId: Number(tabKey), url: "", title: "" };
    const liveTab = await getTabOrNull(storedTab.tabId);
    const metadata = liveTab
      ? {
        ...storedTab,
        url: sanitizeUrl(liveTab.url || storedTab.url || ""),
        title: liveTab.title || storedTab.title || "",
        windowId: numberOrNull(liveTab.windowId)
      }
      : storedTab;

    return {
      tabId: metadata.tabId,
      url: metadata.url || "",
      title: metadata.title || "",
      startedAt: metadata.startedAt || recordingState.startedAt,
      activeRanges: normalizeActiveRanges(metadata.activeRanges),
      events: Array.isArray(eventBuffersByTab?.[tabKey]) ? eventBuffersByTab[tabKey] : []
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

async function appendReplayEvents(events, tabId) {
  if (!Array.isArray(events) || !events.length) return;

  const { recordingState, replayEvents = [] } = await chrome.storage.local.get([
    "recordingState",
    "replayEvents"
  ]);

  if (!recordingState?.isRecording) return;
  if (recordingState.rootTabId !== tabId) return;

  const normalizedEvents = addRelativeTimeToReplayEvents(events, recordingState.startedAt);
  const nextReplayEvents = Array.isArray(replayEvents)
    ? [...replayEvents, ...normalizedEvents].slice(-MAX_REPLAY_EVENTS)
    : normalizedEvents.slice(-MAX_REPLAY_EVENTS);

  const storageResult = await setReplayEventsWithFallback(nextReplayEvents);
  await chrome.storage.local.set({
    replayStatus: {
      ...(await getReplayStatus()),
      lastBatchAt: Date.now(),
      lastBatchSize: normalizedEvents.length,
      storageError: storageResult.ok ? null : storageResult.error
    }
  });
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

async function getReplayStatus() {
  const { replayStatus } = await chrome.storage.local.get("replayStatus");
  return replayStatus || {
    started: false,
    startError: null,
    lastBatchAt: null,
    lastBatchSize: 0,
    storageError: null
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
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
