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
