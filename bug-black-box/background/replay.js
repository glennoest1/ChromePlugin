const MAX_REPLAY_EVENTS = 5000;
const MIN_REPLAY_EVENTS = 25;
const REPLAY_STOP_EVENT_GRACE_MS = 250;

function shouldStartReplayFromEvent(recordingState, event) {
  return normalizeRecordingMode(recordingState.mode) === "allTabs" &&
    (event.type === "click" || event.type === "submit");
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

  const acceptedEvents = filterReplayEventsAtCurrentStopState(recordingState, events);
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

function filterReplayEventsAtCurrentStopState(recordingState, events) {
  if (recordingState?.isRecording) return events;
  if (!recordingState?.stoppedAt) return [];

  return events.filter((event) => {
    const timestamp = Number(event?.timestamp);
    return Number.isFinite(timestamp) &&
      timestamp <= recordingState.stoppedAt + REPLAY_STOP_EVENT_GRACE_MS;
  });
}

function sendTabMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(() => null);
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
      return Number.isFinite(timestamp) && timestamp <= stopTime + REPLAY_STOP_EVENT_GRACE_MS;
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
