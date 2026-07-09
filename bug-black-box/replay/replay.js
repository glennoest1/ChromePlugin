const ALL_TABS_VALUE = "__all__";
const SEGMENT_END_TOLERANCE_MS = 300;

const meta = document.getElementById("meta");
const emptyState = document.getElementById("emptyState");
const replayShell = document.getElementById("replayShell");
const playerTarget = document.getElementById("player");
const tabSelect = document.getElementById("tabSelect");
const eventCount = document.getElementById("eventCount");
const duration = document.getElementById("duration");
const playButton = document.getElementById("playButton");
const restartButton = document.getElementById("restartButton");
const seekRange = document.getElementById("seekRange");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const speedSelect = document.getElementById("speedSelect");

let player = null;
let replayTabs = [];
let replayEventsByTab = {};
let timelineSegments = [];
let selectedMode = "tab";
let selectedTabId = null;
let activeSegmentIndex = -1;
let activeEvents = [];
let activeFirstTimestamp = 0;
let timelineStart = 0;
let totalDuration = 0;
let isPlaying = false;
let isSeeking = false;
let currentOffset = 0;
let frameId = null;
let segmentAdvanceTimer = null;
let playerVersion = 0;
let suppressPlayerStateEvents = false;

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

function renderTabOptions() {
  const options = [];
  if (timelineSegments.length > 1) {
    const totalEvents = Object.values(replayEventsByTab).reduce((total, events) =>
      total + (Array.isArray(events) ? events.length : 0), 0);
    options.push(`<option value="${ALL_TABS_VALUE}">All clicked tabs (${totalEvents} events)</option>`);
  }

  options.push(...replayTabs.map((tab) => {
    const title = tab.title || tab.url || `Tab ${tab.tabId}`;
    return `<option value="${escapeHtml(tab.tabId)}">${escapeHtml(title)} (${tab.eventCount} events)</option>`;
  }));

  tabSelect.innerHTML = options.join("");
  tabSelect.value = selectedMode === "all" ? ALL_TABS_VALUE : String(selectedTabId);
}

function wireStaticControls() {
  tabSelect.addEventListener("change", async () => {
    if (tabSelect.value === ALL_TABS_VALUE) {
      selectedMode = "all";
      await loadAllTabsTimeline(0);
      return;
    }

    selectedMode = "tab";
    await loadSelectedTab(Number(tabSelect.value));
  });

  playButton.addEventListener("click", () => {
    if (isPlaying) {
      pauseReplay();
    } else {
      playReplay(currentOffset);
    }
  });

  restartButton.addEventListener("click", () => {
    seekTo(0, false);
    playReplay(0);
  });

  seekRange.addEventListener("input", () => {
    isSeeking = true;
    updateTimeline(Number(seekRange.value));
  });

  seekRange.addEventListener("change", () => {
    isSeeking = false;
    seekTo(Number(seekRange.value), isPlaying);
  });

  speedSelect.addEventListener("change", () => {
    if (player) player.setSpeed(Number(speedSelect.value));
    scheduleSegmentAdvance();
  });
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

function createPlayer(events) {
  playerVersion += 1;
  const version = playerVersion;
  player = new window.rrwebPlayer({
    target: playerTarget,
    props: {
      events,
      width: getPlayerWidth(),
      height: getPlayerHeight(),
      autoPlay: false,
      showController: false,
      speedOption: [1, 2, 4, 8]
    }
  });
  wirePlayerEvents(version);
  if (Number(speedSelect.value) !== 1) player.setSpeed(Number(speedSelect.value));
}

function wirePlayerEvents(version) {
  player.addEventListener("ui-update-current-time", (event) => {
    if (version !== playerVersion) return;

    const time = getPlayerEventPayload(event) || 0;
    if (isSeeking) return;

    if (selectedMode === "all") {
      const nextGlobalOffset = activeFirstTimestamp + time - timelineStart;
      if (shouldTreatAsSegmentRewind(nextGlobalOffset)) {
        advanceToNextGlobalSegment();
        return;
      }
      updateTimeline(nextGlobalOffset);
      return;
    }

    updateTimeline(time);
  });

  player.addEventListener("ui-update-player-state", (event) => {
    if (version !== playerVersion) return;
    if (suppressPlayerStateEvents) return;

    const state = getPlayerEventPayload(event);
    if (selectedMode === "all" && state !== "playing" && shouldAdvanceFromCurrentSegment()) {
      advanceToNextGlobalSegment();
      return;
    }
    setPlayingState(state === "playing");
  });
}

function destroyPlayer(options = {}) {
  const {
    resetTimeline = true,
    resetPlaying = true
  } = options;

  if (player?.$destroy) player.$destroy();
  playerVersion += 1;
  player = null;
  playerTarget.innerHTML = "";

  if (resetPlaying) setPlayingState(false);
  if (resetTimeline) updateTimeline(0);
}

function showEmpty(message) {
  emptyState.hidden = false;
  replayShell.hidden = true;
  meta.textContent = message;
}

function playReplay(offset) {
  if (selectedMode === "all") {
    switchToSegmentForOffset(offset, true);
    return;
  }

  if (!player) return;
  player.play(normalizeOffset(offset));
  setPlayingState(true);
  startTimelineLoop();
}

function pauseReplay() {
  if (!player) return;
  player.pause();
  setPlayingState(false);
  stopTimelineLoop();
}

function seekTo(offset, shouldPlay) {
  const nextOffset = normalizeOffset(offset);
  currentOffset = nextOffset;
  updateTimeline(nextOffset);

  if (selectedMode === "all") {
    switchToSegmentForOffset(nextOffset, shouldPlay);
    return;
  }

  if (!player) return;
  player.goto(nextOffset, shouldPlay);
  setPlayingState(Boolean(shouldPlay));
  if (shouldPlay) startTimelineLoop();
}

function setPlayingState(nextIsPlaying) {
  isPlaying = nextIsPlaying;
  playButton.textContent = isPlaying ? "Pause" : "Play";
  playButton.classList.toggle("primary", !isPlaying);
}

function startTimelineLoop() {
  stopTimelineLoop();
  const tick = () => {
    if (player && isPlaying && !isSeeking) {
      const replayer = player.getReplayer();
      if (replayer?.getCurrentTime) {
        const currentTimeValue = replayer.getCurrentTime();
        if (selectedMode === "all") {
          const globalOffset = activeFirstTimestamp + currentTimeValue - timelineStart;
          if (shouldTreatAsSegmentRewind(globalOffset)) {
            advanceToNextGlobalSegment();
            return;
          }
          updateTimeline(globalOffset);
          maybeAdvanceGlobalSegment(globalOffset);
        } else {
          updateTimeline(currentTimeValue);
        }
      }
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
}

function maybeAdvanceGlobalSegment(globalOffset) {
  const effectiveEndOffset = getActiveSegmentEffectiveEndOffset();
  if (globalOffset < effectiveEndOffset - SEGMENT_END_TOLERANCE_MS && globalOffset < totalDuration) {
    return;
  }

  advanceToNextGlobalSegment();
}

function shouldAdvanceFromCurrentSegment() {
  const segment = timelineSegments[activeSegmentIndex];
  const replayer = player?.getReplayer?.();
  if (!segment || !replayer?.getCurrentTime) return false;

  const effectiveEndOffset = getActiveSegmentEffectiveEndOffset();
  if (currentOffset >= effectiveEndOffset - SEGMENT_END_TOLERANCE_MS) return true;

  const activeLastTimestamp = activeEvents.length
    ? activeEvents[activeEvents.length - 1].timestamp
    : segment.end;
  const effectiveEnd = Math.min(segment.end, activeLastTimestamp);
  const absoluteTime = activeFirstTimestamp + replayer.getCurrentTime();

  return absoluteTime >= effectiveEnd - SEGMENT_END_TOLERANCE_MS;
}

function shouldTreatAsSegmentRewind(nextGlobalOffset) {
  if (!isPlaying || activeSegmentIndex < 0) return false;

  const segment = timelineSegments[activeSegmentIndex];
  if (!segment) return false;

  const effectiveEndOffset = getActiveSegmentEffectiveEndOffset();
  const nearSegmentEnd = currentOffset >= effectiveEndOffset - SEGMENT_END_TOLERANCE_MS;
  const rewound = nextGlobalOffset < currentOffset - SEGMENT_END_TOLERANCE_MS;
  return nearSegmentEnd && rewound;
}

function advanceToNextGlobalSegment() {
  const nextIndex = activeSegmentIndex + 1;
  if (!timelineSegments[nextIndex]) {
    pauseReplay();
    updateTimeline(totalDuration);
    return;
  }

  switchToSegmentForOffset(timelineSegments[nextIndex].start - timelineStart, true);
}

function stopTimelineLoop() {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
  clearSegmentAdvanceTimer();
}

function scheduleSegmentAdvance() {
  clearSegmentAdvanceTimer();
  if (selectedMode !== "all" || activeSegmentIndex < 0 || !isPlaying) return;

  const remaining = getActiveSegmentEffectiveEndOffset() - currentOffset;
  const speed = Math.max(1, Number(speedSelect.value) || 1);
  const delay = Math.max(0, remaining / speed) + SEGMENT_END_TOLERANCE_MS;

  segmentAdvanceTimer = setTimeout(() => {
    if (selectedMode === "all" && activeSegmentIndex >= 0) advanceToNextGlobalSegment();
  }, delay);
}

function clearSegmentAdvanceTimer() {
  if (!segmentAdvanceTimer) return;
  clearTimeout(segmentAdvanceTimer);
  segmentAdvanceTimer = null;
}

function getActiveSegmentEffectiveEndOffset() {
  const segment = timelineSegments[activeSegmentIndex];
  if (!segment) return totalDuration;

  const activeLastTimestamp = activeEvents.length
    ? activeEvents[activeEvents.length - 1].timestamp
    : segment.end;
  const effectiveEnd = Math.min(segment.end, activeLastTimestamp);

  return Math.max(0, effectiveEnd - timelineStart);
}

function updateTimeline(offset) {
  currentOffset = normalizeOffset(offset);
  seekRange.value = String(Math.round(currentOffset));
  currentTime.textContent = formatDuration(currentOffset);
}

function findSegmentIndex(absoluteTime) {
  const exactIndex = timelineSegments.findIndex((segment) =>
    absoluteTime >= segment.start && absoluteTime < segment.end
  );
  if (exactIndex >= 0) return exactIndex;

  const nextIndex = timelineSegments.findIndex((segment) => absoluteTime < segment.start);
  if (nextIndex >= 0) return nextIndex;
  return Math.max(0, timelineSegments.length - 1);
}

function normalizeTimeline(segments) {
  return (Array.isArray(segments) ? segments : [])
    .map((segment) => ({
      tabId: Number(segment.tabId),
      title: segment.title || "",
      url: segment.url || "",
      start: Number(segment.start),
      end: Number(segment.end)
    }))
    .filter((segment) =>
      Number.isFinite(segment.tabId) &&
      Number.isFinite(segment.start) &&
      Number.isFinite(segment.end) &&
      segment.end > segment.start
    )
    .sort((a, b) => a.start - b.start);
}

function sortReplayEvents(events) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => Number.isFinite(Number(event?.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function getPlayerEventPayload(event) {
  if (event?.detail && typeof event.detail === "object" && "payload" in event.detail) {
    return event.detail.payload;
  }
  if (event?.detail !== undefined) return event.detail;
  if (event?.payload !== undefined) return event.payload;
  return event;
}

function normalizeOffset(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(number, totalDuration));
}

function resizePlayer() {
  if (player?.$set) {
    player.$set({
      width: getPlayerWidth(),
      height: getPlayerHeight()
    });
  }
}

function getPlayerWidth() {
  return Math.max(760, playerTarget.clientWidth || window.innerWidth - 36);
}

function getPlayerHeight() {
  return Math.max(420, window.innerHeight - 180);
}

function formatDuration(milliseconds) {
  const safeMilliseconds = Number.isFinite(Number(milliseconds)) ? Number(milliseconds) : 0;
  const totalSeconds = Math.max(0, Math.floor(safeMilliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
