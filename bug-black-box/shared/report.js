function getReportTabs(report) {
  if (Array.isArray(report?.tabs)) return report.tabs;
  return [{
    tabId: report?.tabId || report?.rootTabId || 0,
    url: report?.tabUrl || "",
    title: report?.tabTitle || "",
    events: Array.isArray(report?.events) ? report.events : []
  }];
}

function getReportEvents(report) {
  const tabEvents = getReportTabs(report).flatMap((tab) => Array.isArray(tab.events) ? tab.events : []);
  if (tabEvents.length) return tabEvents;
  return Array.isArray(report?.events) ? report.events : [];
}

function getTabReplayEvents(tab) {
  if (Array.isArray(tab?.replay?.events)) return tab.replay.events;
  if (Array.isArray(tab?.replayEvents)) return tab.replayEvents;
  return [];
}

function getTabReplayEventCount(tab) {
  if (Number(tab?.replay?.eventCount)) return Number(tab.replay.eventCount);
  if (Number(tab?.replayEventCount)) return Number(tab.replayEventCount);
  return getTabReplayEvents(tab).length;
}

function getTotalReplayEvents(report) {
  if (Number(report?.summary?.totalReplayEvents)) return Number(report.summary.totalReplayEvents);
  if (Number(report?.replayEventCount)) return Number(report.replayEventCount);
  return getReportTabs(report).reduce((total, tab) => total + getTabReplayEventCount(tab), 0);
}

function getReportScreenshots(report) {
  if (Array.isArray(report?.screenshots) && report.screenshots.length) {
    return report.screenshots.filter((screenshot) => screenshot?.dataUrl);
  }

  if (report?.screenshotBase64) {
    const tabs = getReportTabs(report);
    const rootTab = tabs.find((tab) => tab.tabId === report.rootTabId) || tabs[0] || {};
    return [{
      tabId: rootTab.tabId || report.rootTabId || 0,
      title: rootTab.title || report.tabTitle || "",
      url: rootTab.url || report.tabUrl || "",
      dataUrl: report.screenshotBase64,
      reason: "legacy",
      eventType: null,
      severity: null,
      capturedAt: null
    }];
  }

  return [];
}
