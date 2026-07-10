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

function getPlayerEventPayload(event) {
  if (event?.detail && typeof event.detail === "object" && "payload" in event.detail) {
    return event.detail.payload;
  }
  if (event?.detail !== undefined) return event.detail;
  if (event?.payload !== undefined) return event.payload;
  return event;
}
