(() => {
  if (window.__bugBlackBoxSessionRecorderInstalled) return;
  window.__bugBlackBoxSessionRecorderInstalled = true;

  const FLUSH_EVENT_COUNT = 25;
  const FLUSH_INTERVAL_MS = 2000;

  let stopReplayRecording = null;
  let replayBuffer = [];
  let flushTimer = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === "bugBlackBoxReplayPing") {
      sendResponse({ ok: true, hasRrweb: Boolean(window.rrweb?.record) });
      return false;
    }

    if (message?.action === "startSessionReplay") {
      sendResponse(startSessionReplay());
      return false;
    }

    if (message?.action === "stopSessionReplay") {
      stopSessionReplay();
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  function startSessionReplay() {
    if (stopReplayRecording) return { ok: true, recording: true };
    if (!window.rrweb?.record) {
      return { ok: false, recording: false, error: "RRWEB_NOT_LOADED" };
    }

    replayBuffer = [];
    flushTimer = window.setInterval(flushReplayEvents, FLUSH_INTERVAL_MS);

    try {
      stopReplayRecording = window.rrweb.record({
        emit(event) {
          replayBuffer.push(event);
          if (replayBuffer.length >= FLUSH_EVENT_COUNT) {
            flushReplayEvents();
          }
        },
        maskAllInputs: true,
        blockClass: "bug-black-box-block",
        ignoreClass: "bug-black-box-ignore"
      });
    } catch (error) {
      if (flushTimer) {
        window.clearInterval(flushTimer);
        flushTimer = null;
      }
      return {
        ok: false,
        recording: false,
        error: error.message || "REPLAY_START_FAILED"
      };
    }

    return { ok: true, recording: Boolean(stopReplayRecording) };
  }

  function stopSessionReplay() {
    if (stopReplayRecording) {
      stopReplayRecording();
      stopReplayRecording = null;
    }

    if (flushTimer) {
      window.clearInterval(flushTimer);
      flushTimer = null;
    }

    flushReplayEvents();
  }

  function flushReplayEvents() {
    if (!replayBuffer.length) return;

    const events = replayBuffer;
    replayBuffer = [];

    chrome.runtime.sendMessage({
      action: "recordReplayEvents",
      events
    }).catch(() => {
      replayBuffer = events.concat(replayBuffer).slice(-FLUSH_EVENT_COUNT * 4);
    });
  }
})();
