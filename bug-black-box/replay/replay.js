document.addEventListener("DOMContentLoaded", init);

async function init() {
  await bbbInitI18n();
  renderReplayChrome();
  const shareId = getShareIdFromUrl();
  const response = shareId
    ? await loadSharedReplay(shareId)
    : await chrome.runtime.sendMessage({ action: "getReplayEvents" }).catch(() => null);

  if (shareId && !response?.ok) {
    showEmpty(getSharedReplayErrorMessage(response?.error));
    return;
  }

  replayTabs = response?.replayTabs || [];
  replayEventsByTab = response?.replayEventsByTab || {};
  timelineSegments = normalizeTimeline(response?.timeline || []);
  selectedMode = timelineSegments.length > 1 ? "all" : "tab";
  selectedTabId = response?.selectedTabId ?? replayTabs[0]?.tabId ?? null;

  if (!window.rrwebPlayer || !replayTabs.length) {
    showEmpty(shareId ? bbbT("noReplayShared") : bbbT("noReplayLatest"));
    return;
  }

  renderTabOptions();
  wireStaticControls();

  if (selectedMode === "all") {
    await loadAllTabsTimeline(0);
  } else {
    await loadSelectedTab(selectedTabId);
  }

  window.addEventListener("resize", resizePlayer);
}

async function loadSharedReplay(shareId) {
  meta.textContent = bbbT("loadingSharedReport");
  const response = await chrome.runtime.sendMessage({
    action: "fetchSharedReport",
    shareId
  }).catch(() => ({ ok: false, error: "NETWORK_ERROR" }));

  if (!response?.ok) return response || { ok: false, error: "FETCH_REPORT_FAILED" };

  sharedReplayReport = response.report;
  sharedReplayMeta = response;
  const replayData = buildReplayDataFromReport(response.report);
  return {
    ok: true,
    replayEvents: replayData.selectedEvents,
    replayEventsByTab: replayData.replayEventsByTab,
    replayTabs: replayData.replayTabs,
    selectedTabId: replayData.selectedTabId,
    timeline: replayData.timeline
  };
}

function renderReplayChrome() {
  document.title = `${bbbT("replayTitle")} - Bug Black Box`;
  replayTitle.textContent = bbbT("replayTitle");
  meta.textContent = bbbT("loadingReplay");
  replayTabLabel.textContent = bbbT("replayTab");
  eventsLabel.textContent = bbbT("events");
  durationLabel.textContent = bbbT("duration");
  emptyState.textContent = bbbT("noReplayData");
  playButton.textContent = bbbT("play");
  restartButton.textContent = bbbT("restart");
  speedLabel.textContent = bbbT("speed");
  document.getElementById("languageSlot").innerHTML = bbbRenderLanguageSelect();
  bbbWireLanguageSelect();
}

async function loadSelectedTab(tabId) {
  stopTimelineLoop();
  destroyPlayer();
  selectedMode = "tab";
  selectedTabId = tabId;
  activeSegmentIndex = -1;

  const response = sharedReplayReport
    ? {
      replayEvents: replayEventsByTab[String(tabId)] || [],
      replayTabs
    }
    : await chrome.runtime.sendMessage({
      action: "getReplayEvents",
      tabId
    }).catch(() => null);
  const events = sortReplayEvents(response?.replayEvents || []);
  const selectedTab = (response?.replayTabs || replayTabs).find((tab) => tab.tabId === tabId) || {};

  if (events.length < 2) {
    showEmpty(bbbT("incompleteReplay"));
    return;
  }

  activeEvents = events;
  activeFirstTimestamp = events[0].timestamp;
  totalDuration = Math.max(0, events[events.length - 1].timestamp - events[0].timestamp);
  replayShell.hidden = false;
  emptyState.hidden = true;
  const title = selectedTab.title || selectedTab.url || bbbT("selectedTab");
  meta.textContent = sharedReplayMeta?.shareId
    ? bbbT("selectedSharedTabReplay", { title, shareId: sharedReplayMeta.shareId })
    : bbbT("selectedTabReplay", { title });
  eventCount.textContent = String(events.length);
  duration.textContent = formatDuration(totalDuration);
  totalTime.textContent = formatDuration(totalDuration);
  seekRange.max = String(Math.max(1, totalDuration));
  speedSelect.value = "1";
  setPlayingState(false);

  createPlayer(events);
  updateTimeline(0);
}

function getShareIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("shareId") || params.get("id") || "";
}

function buildReplayDataFromReport(report) {
  const tabs = getReportTabs(report);
  const tabsById = new Map(tabs.map((tab) => [String(tab.tabId), tab]));
  const replayEventsByTabFromReport = tabs.reduce((eventsByTab, tab) => {
    const events = getTabReplayEvents(tab);
    if (events.length) {
      eventsByTab[String(tab.tabId)] = sortReplayEvents(events);
    }
    return eventsByTab;
  }, {});
  const replayTabsFromReport = Object.entries(replayEventsByTabFromReport).map(([tabKey, events]) => {
    const tab = tabsById.get(tabKey) || {};
    return {
      tabId: Number(tabKey),
      title: tab.title || "",
      url: tab.url || "",
      eventCount: events.length
    };
  }).sort((a, b) => {
    if (a.tabId === report?.rootTabId) return -1;
    if (b.tabId === report?.rootTabId) return 1;
    return a.tabId - b.tabId;
  });
  const selectedSharedTabId = replayTabsFromReport[0]?.tabId ?? null;

  return {
    replayEventsByTab: replayEventsByTabFromReport,
    replayTabs: replayTabsFromReport,
    selectedTabId: selectedSharedTabId,
    selectedEvents: replayEventsByTabFromReport[String(selectedSharedTabId)] || [],
    timeline: buildSharedReplayTimeline(report, replayEventsByTabFromReport)
  };
}

function buildSharedReplayTimeline(report, replayEventsByTabForReport) {
  const tabs = getReportTabs(report);
  const tabsById = new Map(tabs.map((tab) => [String(tab.tabId), tab]));
  return Object.entries(replayEventsByTabForReport || {}).map(([tabKey, events]) => {
    const sortedEvents = sortReplayEvents(events);
    if (sortedEvents.length < 2) return null;
    const tab = tabsById.get(tabKey) || {};
    return {
      tabId: Number(tabKey),
      title: tab.title || "",
      url: tab.url || "",
      start: sortedEvents[0].timestamp,
      end: sortedEvents[sortedEvents.length - 1].timestamp
    };
  }).filter(Boolean).sort((a, b) => a.start - b.start);
}

function getSharedReplayErrorMessage(error) {
  if (error === "REPORT_NOT_FOUND") return bbbT("sharedReportNotFound");
  if (error === "MISSING_BACKEND_URL") return bbbT("missingBackendUrl");
  if (error === "NETWORK_ERROR") return bbbT("networkError");
  if (error === "INVALID_SHARED_REPORT") return bbbT("sharedReportInvalid");
  return bbbT("sharedReportLoadFailed");
}

async function loadAllTabsTimeline(offset = 0) {
  stopTimelineLoop();
  destroyPlayer();
  selectedMode = "all";

  if (timelineSegments.length < 2) {
    await loadSelectedTab(selectedTabId);
    return;
  }

  const firstSegment = timelineSegments[0];
  const lastSegment = timelineSegments[timelineSegments.length - 1];
  timelineStart = firstSegment.start;
  totalDuration = Math.max(0, lastSegment.end - firstSegment.start);
  replayShell.hidden = false;
  emptyState.hidden = true;
  meta.textContent = bbbT("timelineSegments", { count: timelineSegments.length });
  eventCount.textContent = String(Object.values(replayEventsByTab).reduce((total, events) =>
    total + (Array.isArray(events) ? events.length : 0), 0));
  duration.textContent = formatDuration(totalDuration);
  totalTime.textContent = formatDuration(totalDuration);
  seekRange.max = String(Math.max(1, totalDuration));
  speedSelect.value = "1";
  setPlayingState(false);

  await switchToSegmentForOffset(offset, false);
  updateTimeline(offset);
}

async function switchToSegmentForOffset(offset, shouldPlay) {
  clearSegmentAdvanceTimer();
  const absoluteTime = timelineStart + normalizeOffset(offset);
  const segmentIndex = findSegmentIndex(absoluteTime);
  const segment = timelineSegments[segmentIndex];
  if (!segment) return;

  const tabKey = String(segment.tabId);
  const events = sortReplayEvents(replayEventsByTab[tabKey] || []);
  if (events.length < 2) return;

  const nextOffset = normalizeOffset(offset);
  if (segmentIndex !== activeSegmentIndex) {
    suppressPlayerStateEvents = true;
    destroyPlayer({ resetTimeline: false, resetPlaying: false });
    activeSegmentIndex = segmentIndex;
    activeEvents = events;
    activeFirstTimestamp = events[0].timestamp;
    createPlayer(events);
    suppressPlayerStateEvents = false;
  }

  const playerOffset = Math.max(0, absoluteTime - activeFirstTimestamp);
  player.goto(playerOffset, false);
  updateTimeline(nextOffset);

  if (shouldPlay) {
    requestAnimationFrame(() => {
      if (!player) return;
      player.play(playerOffset);
      setPlayingState(true);
      startTimelineLoop();
      scheduleSegmentAdvance();
    });
    return;
  }

  setPlayingState(Boolean(shouldPlay));
}
