function buildJsonDownloadReport(report) {
  const tabs = getReportTabs(report);
  const normalizedEvents = dedupeReportEvents(getReportEvents(report), tabs);
  const eventCountsByTab = countEventsByTab(normalizedEvents);
  const screenshots = dedupeReportScreenshots(getReportScreenshots(report));
  const screenshotByTab = new Map(screenshots.map((screenshot) => [String(screenshot.tabId), screenshot.screenshotId]));
  const rootScreenshot = screenshots.find((screenshot) => screenshot.tabId === report.rootTabId) || screenshots[0] || null;
  const summary = buildDownloadSummary(report, tabs, normalizedEvents, screenshots);

  return removeEmptyFields({
    version: report.version,
    mode: report.mode,
    rootTabId: report.rootTabId,
    startedAt: report.startedAt,
    stoppedAt: report.stoppedAt,
    durationSeconds: report.durationSeconds,
    summary,
    events: normalizedEvents,
    tabs: tabs.map((tab) => buildDownloadTab(
      tab,
      eventCountsByTab.get(String(tab.tabId)) || 0,
      screenshotByTab.get(String(tab.tabId)) || null
    )),
    replayEventCount: report.replayEventCount,
    replayTabs: report.replayTabs || [],
    replayStatus: report.replayStatus || null,
    screenshots,
    primaryScreenshotId: rootScreenshot?.screenshotId || null,
    screenshotError: screenshots.length ? null : report.screenshotError || null,
    aiExplanation: report.aiExplanation || null
  });
}

function buildDownloadTab(tab, eventCount, screenshotId) {
  return removeEmptyFields({
    tabId: tab.tabId,
    title: tab.title || "",
    url: tab.url || "",
    windowId: tab.windowId,
    startedAt: tab.startedAt,
    activeRanges: tab.activeRanges,
    eventCount,
    replay: tab.replay ? {
      eventCount: getTabReplayEventCount(tab),
      truncated: Boolean(tab.replay.truncated),
      truncatedReason: tab.replay.truncatedReason || null
    } : null,
    screenshotId,
    screenshotError: tab.screenshotError || null
  });
}

function countEventsByTab(events) {
  return (Array.isArray(events) ? events : []).reduce((counts, event) => {
    const tabKey = String(event.tabId || "");
    counts.set(tabKey, (counts.get(tabKey) || 0) + 1);
    return counts;
  }, new Map());
}

function buildDownloadSummary(report, tabs, events, screenshots) {
  return {
    ...(report.summary || {}),
    tabCount: tabs.length,
    totalEvents: events.length,
    totalReplayEvents: getTotalReplayEvents(report),
    screenshotCount: screenshots.length
  };
}

function dedupeReportEvents(events, tabs) {
  const tabsById = new Map(tabs.map((tab) => [String(tab.tabId), tab]));
  const byKey = new Map();

  for (const event of Array.isArray(events) ? events : []) {
    const key = getEventDedupeKey(event, tabsById);
    const existing = byKey.get(key);
    if (!existing || shouldPreferEvent(event, existing)) {
      byKey.set(key, event);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
    .map((event) => {
      if (event?.type === "network" || event?.type === "networkError") {
        return {
          ...event,
          url: canonicalEventUrl(event, tabsById)
        };
      }
      return { ...event };
    });
}

function getEventDedupeKey(event, tabsById) {
  if (event?.type === "network" || event?.type === "networkError") {
    return [
      "network",
      event.tabId || "",
      String(event.method || "GET").toUpperCase(),
      canonicalEventUrl(event, tabsById),
      Number(event.statusCode || 0),
      event.triggeredByActionId || "",
      event.error || ""
    ].join("|");
  }

  if (event?.eventId) return `eventId|${event.eventId}`;

  return [
    "event",
    event?.tabId || "",
    event?.type || "",
    event?.timestamp || "",
    event?.selector || "",
    event?.message || "",
    event?.url || ""
  ].join("|");
}

function shouldPreferEvent(nextEvent, currentEvent) {
  if (nextEvent.type === "network" && currentEvent.type === "networkError") return true;
  if (nextEvent.type === "networkError" && currentEvent.type === "network") return false;
  return getEventRichnessScore(nextEvent) > getEventRichnessScore(currentEvent);
}

function getEventRichnessScore(event) {
  return [
    event.responseBody,
    event.responseHeaders && Object.keys(event.responseHeaders).length,
    event.requestBody,
    event.requestHeaders && Object.keys(event.requestHeaders).length,
    Number.isFinite(event.durationMs),
    event.source
  ].reduce((score, value) => score + (value ? 1 : 0), 0);
}

function canonicalEventUrl(event, tabsById) {
  const rawUrl = String(event?.url || "");
  const tab = tabsById.get(String(event?.tabId));

  try {
    const parsed = new URL(rawUrl, tab?.url || undefined);
    parsed.hash = "";
    return sanitizeUrl(parsed.toString());
  } catch {
    return sanitizeUrl(rawUrl);
  }
}

function dedupeReportScreenshots(screenshots) {
  const seen = new Map();
  const result = [];

  for (const screenshot of Array.isArray(screenshots) ? screenshots : []) {
    if (!screenshot?.dataUrl) continue;
    const existingId = seen.get(screenshot.dataUrl);
    if (existingId) continue;

    const screenshotId = `screenshot-${result.length + 1}`;
    seen.set(screenshot.dataUrl, screenshotId);
    result.push({
      screenshotId,
      tabId: screenshot.tabId,
      title: screenshot.title || "",
      url: screenshot.url || "",
      reason: screenshot.reason || null,
      eventType: screenshot.eventType || null,
      severity: screenshot.severity || null,
      capturedAt: screenshot.capturedAt || null,
      dataUrl: screenshot.dataUrl
    });
  }

  return result;
}

function removeEmptyFields(value) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) =>
    fieldValue !== undefined && fieldValue !== null
  ));
}
