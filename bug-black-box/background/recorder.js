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
