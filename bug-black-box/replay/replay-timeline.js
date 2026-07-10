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

function normalizeOffset(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(number, totalDuration));
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
