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
