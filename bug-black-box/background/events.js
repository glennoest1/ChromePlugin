let writeQueue = Promise.resolve();

function recordNetworkError(event, tabId) {
  if (typeof tabId !== "number" || tabId < 0) return;
  enqueueAppendEvent({
    type: "networkError",
    method: event.method,
    url: event.url,
    statusCode: event.statusCode,
    error: event.error,
    timestamp: event.timestamp
  }, tabId);
}

function enqueueAppendEvent(rawEvent, tabId) {
  writeQueue = writeQueue.catch(() => { }).then(() => appendEvent(rawEvent, tabId));
  return writeQueue;
}

function enqueueAppendReplayEvents(events, tabId) {
  writeQueue = writeQueue.catch(() => { }).then(() => appendReplayEvents(events, tabId));
  return writeQueue;
}

async function appendEvent(rawEvent, tabId) {
  const { recordingState, eventBuffersByTab = {} } = await chrome.storage.local.get([
    "recordingState",
    "eventBuffersByTab"
  ]);

  const sanitizedEvent = sanitizeEvent(rawEvent);
  if (!sanitizedEvent) return;
  if (!shouldAcceptEventAtCurrentStopState(recordingState, sanitizedEvent)) return;
  if (!shouldRecordTab(recordingState, tabId)) return;

  const stateWithTab = await ensureRecordedTab(recordingState, tabId);
  if (!stateWithTab) return;

  const tabKey = String(tabId);
  const currentBuffer = Array.isArray(eventBuffersByTab[tabKey])
    ? eventBuffersByTab[tabKey]
    : [];
  const prepared = prepareEvent(sanitizedEvent, tabId, stateWithTab, currentBuffer);
  if (!prepared) return;

  const nextState = applyEventToRecordingState(prepared.recordingState, prepared.event);
  const nextBuffers = {
    ...eventBuffersByTab,
    [tabKey]: [...currentBuffer, prepared.event].slice(-MAX_EVENTS)
  };
  const flatEvents = getBufferedEvents(nextBuffers)
    .sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp))
    .slice(-MAX_EVENTS);

  await chrome.storage.local.set({
    recordingState: nextState,
    eventBuffersByTab: nextBuffers,
    eventBuffer: flatEvents
  });

  if (recordingState.isRecording && shouldCaptureScreenshotForEvent(prepared.event)) {
    await maybeCaptureErrorScreenshot(tabId, prepared.event);
  }

  if (recordingState.isRecording && shouldStartReplayFromEvent(recordingState, prepared.event)) {
    await startReplayForTab(tabId);
  }
}

function getBufferedEvents(eventBuffersByTab) {
  return Object.values(eventBuffersByTab || {}).flatMap((events) =>
    Array.isArray(events) ? events : []
  );
}

function shouldAcceptEventAtCurrentStopState(recordingState, event) {
  if (recordingState?.isRecording) return true;
  if (!recordingState?.stoppedAt) return false;

  const timestamp = Number(event?.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= recordingState.stoppedAt + STOP_EVENT_GRACE_MS;
}

function trimEventBuffersByStopTime(eventBuffersByTab, stoppedAt) {
  return Object.fromEntries(Object.entries(eventBuffersByTab || {}).map(([tabKey, events]) => [
    tabKey,
    trimEventsByStopTime(events, stoppedAt)
  ]));
}

function trimEventsByStopTime(events, stoppedAt) {
  const stopTime = Number(stoppedAt);
  if (!Number.isFinite(stopTime)) return Array.isArray(events) ? events : [];

  return (Array.isArray(events) ? events : []).filter((event) => {
    const timestamp = Number(event?.timestamp);
    return Number.isFinite(timestamp) && timestamp <= stopTime + STOP_EVENT_GRACE_MS;
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function waitForWriteQueue(timeoutMs) {
  return Promise.race([
    writeQueue.catch(() => { }),
    wait(timeoutMs)
  ]);
}

function prepareEvent(rawEvent, tabId, recordingState, currentBuffer) {
  const sanitizedEvent = sanitizeEvent(rawEvent);
  if (!sanitizedEvent) return null;

  let nextState = recordingState;
  const event = buildBaseEvent(sanitizedEvent, tabId, recordingState);

  if (ACTION_EVENT_TYPES.has(event.type)) {
    const actionSeq = Number(recordingState.nextActionSeq || 0) + 1;
    event.eventId = stringifyValue(rawEvent.eventId || `action-${recordingState.startedAt}-${actionSeq}`);
    applySpamMetadata(event, currentBuffer);
    nextState = {
      ...recordingState,
      nextActionSeq: actionSeq
    };
  }

  if (CORRELATABLE_EVENT_TYPES.has(event.type)) {
    const action = findRecentAction(currentBuffer, event.timestamp);
    if (action?.eventId) event.triggeredByActionId = action.eventId;
  }

  if (event.type === "console" && !shouldKeepConsoleEvent(event)) {
    return null;
  }

  if (event.type === "network" && !shouldKeepNetworkEvent(event)) {
    return null;
  }

  return {
    event,
    recordingState: nextState
  };
}

function buildBaseEvent(event, tabId, recordingState) {
  const timestamp = normalizeTimestamp(event.timestamp);
  return {
    ...event,
    tabId,
    timestamp,
    relativeTime: getRelativeTime(timestamp, recordingState.startedAt)
  };
}

function applySpamMetadata(event, currentBuffer) {
  if (!event.selector) return;

  let spamCount = 1;
  for (let index = currentBuffer.length - 1; index >= 0; index -= 1) {
    const previousEvent = currentBuffer[index];
    if (!ACTION_EVENT_TYPES.has(previousEvent?.type)) continue;
    if (event.timestamp - normalizeTimestamp(previousEvent.timestamp) > SPAM_WINDOW_MS) break;
    if (previousEvent.selector !== event.selector) break;
    spamCount += 1;
  }

  if (spamCount >= 3) {
    event.isSpam = true;
    event.spamCount = spamCount;
  }
}

function findRecentAction(events, timestamp) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!ACTION_EVENT_TYPES.has(event?.type)) continue;
    const elapsed = timestamp - normalizeTimestamp(event.timestamp);
    if (elapsed < 0) continue;
    if (elapsed <= ACTION_CORRELATION_WINDOW_MS) return event;
    return null;
  }
  return null;
}

function getRelativeTime(timestamp, startedAt) {
  return Math.max(0, normalizeTimestamp(timestamp) - normalizeTimestamp(startedAt));
}

function normalizeTimestamp(value) {
  return Number.isFinite(Number(value)) ? Number(value) : Date.now();
}

function countEvents(events) {
  const counts = {
    console: 0,
    consoleError: 0,
    jsError: 0,
    click: 0,
    submit: 0,
    network: 0,
    networkError: 0
  };

  for (const event of Array.isArray(events) ? events : []) {
    if (event.type === "console") {
      counts.console += 1;
      if (event.level === "error") counts.consoleError += 1;
    } else if (Object.prototype.hasOwnProperty.call(counts, event.type)) {
      counts[event.type] += 1;
    }
  }

  return counts;
}
