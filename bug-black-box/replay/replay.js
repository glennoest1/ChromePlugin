const meta = document.getElementById("meta");
const emptyState = document.getElementById("emptyState");
const replayShell = document.getElementById("replayShell");
const playerTarget = document.getElementById("player");
const eventCount = document.getElementById("eventCount");
const duration = document.getElementById("duration");
const playButton = document.getElementById("playButton");
const restartButton = document.getElementById("restartButton");
const seekRange = document.getElementById("seekRange");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const speedSelect = document.getElementById("speedSelect");

let player = null;
let totalDuration = 0;
let isPlaying = false;
let isSeeking = false;
let currentOffset = 0;
let frameId = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const response = await chrome.runtime.sendMessage({ action: "getReplayEvents" }).catch(() => null);
  const events = response?.replayEvents || [];

  if (!events.length || !window.rrwebPlayer) {
    emptyState.hidden = false;
    replayShell.hidden = true;
    meta.textContent = "No replay is available for the latest report.";
    return;
  }

  const sortedEvents = events
    .filter((event) => Number.isFinite(Number(event?.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sortedEvents.length < 2) {
    emptyState.hidden = false;
    replayShell.hidden = true;
    meta.textContent = "Replay data is incomplete.";
    return;
  }

  totalDuration = Math.max(0, sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp);

  meta.textContent = `${sortedEvents.length} replay events captured.`;
  eventCount.textContent = String(sortedEvents.length);
  duration.textContent = formatDuration(totalDuration);
  totalTime.textContent = formatDuration(totalDuration);
  seekRange.max = String(Math.max(1, totalDuration));
  replayShell.hidden = false;

  player = new window.rrwebPlayer({
    target: playerTarget,
    props: {
      events: sortedEvents,
      width: getPlayerWidth(),
      height: getPlayerHeight(),
      autoPlay: false,
      showController: false,
      speedOption: [1, 2, 4, 8]
    }
  });

  wireControls();
  updateTimeline(0);
  window.addEventListener("resize", resizePlayer);
}

function wireControls() {
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
    player.setSpeed(Number(speedSelect.value));
  });

  player.addEventListener("ui-update-current-time", (event) => {
    const time = getPlayerEventPayload(event);
    if (!isSeeking) updateTimeline(time || 0);
  });

  player.addEventListener("ui-update-player-state", (event) => {
    const state = getPlayerEventPayload(event);
    setPlayingState(state === "playing");
  });
}

function playReplay(offset) {
  player.play(normalizeOffset(offset));
  setPlayingState(true);
  startTimelineLoop();
}

function pauseReplay() {
  player.pause();
  setPlayingState(false);
  stopTimelineLoop();
}

function seekTo(offset, shouldPlay) {
  const nextOffset = normalizeOffset(offset);
  currentOffset = nextOffset;
  updateTimeline(nextOffset);
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
        updateTimeline(replayer.getCurrentTime());
      }
    }
    frameId = requestAnimationFrame(tick);
  };
  frameId = requestAnimationFrame(tick);
}

function stopTimelineLoop() {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}

function updateTimeline(offset) {
  currentOffset = normalizeOffset(offset);
  seekRange.value = String(Math.round(currentOffset));
  currentTime.textContent = formatDuration(currentOffset);
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
