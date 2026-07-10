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

function showEmpty(message) {
  emptyState.hidden = false;
  replayShell.hidden = true;
  meta.textContent = message;
}

function setPlayingState(nextIsPlaying) {
  isPlaying = nextIsPlaying;
  playButton.textContent = isPlaying ? "Pause" : "Play";
  playButton.classList.toggle("primary", !isPlaying);
}

function updateTimeline(offset) {
  currentOffset = normalizeOffset(offset);
  seekRange.value = String(Math.round(currentOffset));
  currentTime.textContent = formatDuration(currentOffset);
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
