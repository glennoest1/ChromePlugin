document.addEventListener("DOMContentLoaded", init);

async function init() {
  const response = await chrome.runtime.sendMessage({ action: "getReplayEvents" }).catch(() => null);
  replayTabs = response?.replayTabs || [];
  replayEventsByTab = response?.replayEventsByTab || {};
  timelineSegments = normalizeTimeline(response?.timeline || []);
  selectedMode = timelineSegments.length > 1 ? "all" : "tab";
  selectedTabId = response?.selectedTabId ?? replayTabs[0]?.tabId ?? null;

  if (!window.rrwebPlayer || !replayTabs.length) {
    showEmpty("No replay is available for the latest report.");
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

async function loadSelectedTab(tabId) {
  stopTimelineLoop();
  destroyPlayer();
  selectedMode = "tab";
  selectedTabId = tabId;
  activeSegmentIndex = -1;

  const response = await chrome.runtime.sendMessage({
    action: "getReplayEvents",
    tabId
  }).catch(() => null);
  const events = sortReplayEvents(response?.replayEvents || []);
  const selectedTab = (response?.replayTabs || replayTabs).find((tab) => tab.tabId === tabId) || {};

  if (events.length < 2) {
    showEmpty("Replay data is incomplete for this tab.");
    return;
  }

  activeEvents = events;
  activeFirstTimestamp = events[0].timestamp;
  totalDuration = Math.max(0, events[events.length - 1].timestamp - events[0].timestamp);
  replayShell.hidden = false;
  emptyState.hidden = true;
  meta.textContent = `${selectedTab.title || selectedTab.url || "Selected tab"} replay.`;
  eventCount.textContent = String(events.length);
  duration.textContent = formatDuration(totalDuration);
  totalTime.textContent = formatDuration(totalDuration);
  seekRange.max = String(Math.max(1, totalDuration));
  speedSelect.value = "1";
  setPlayingState(false);

  createPlayer(events);
  updateTimeline(0);
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
  meta.textContent = `${timelineSegments.length} tab segments in one timeline.`;
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
