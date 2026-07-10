function buildMarkdown(report) {
  const tabs = getReportTabs(report);
  const events = dedupeReportEvents(getReportEvents(report), tabs);
  const steps = events.filter((event) => event.type === "click" || event.type === "submit");
  const errors = events.filter((event) => event.type === "jsError");
  const consoleEvents = events.filter((event) => event.type === "console");
  const consoleErrors = consoleEvents.filter((event) => event.level === "error");
  const networkEvents = events.filter((event) => event.type === "network" || event.type === "networkError");
  const networkErrors = networkEvents.filter((event) => event.type === "networkError" || event.error || Number(event.statusCode) >= 400);
  const rootTab = tabs.find((tab) => tab.tabId === report.rootTabId) || tabs[0] || {};
  const title = rootTab.title || rootTab.url || report.tabTitle || report.tabUrl || "Unknown Page";
  const summary = report.summary || {};
  const screenshots = getReportScreenshots(report);

  return `# Bug Report - ${escapeMarkdown(title)}

**Recorded at:** ${formatDateTime(report.startedAt)}
**Mode:** ${MODE_LABELS[normalizeMode(report.mode)] || "Current tab"}
**Root URL:** ${rootTab.url || report.tabUrl || "Unknown"}
**Captured tabs:** ${summary.tabCount || tabs.length}
**Total debug events:** ${summary.totalEvents ?? events.length}
**Total replay events:** ${summary.totalReplayEvents ?? report.replayEventCount ?? 0}
**Recording duration:** ${report.durationSeconds || 0} seconds

## Captured Tabs
${tabs.length ? tabs.map((tab, index) => `${index + 1}. ${escapeMarkdown(tab.title || "Untitled")} - ${tab.url || "Unknown"} (${(tab.events || []).length} events, ${getTabReplayEventCount(tab)} replay events)`).join("\n") : "(No tabs captured.)"}

## Steps to Reproduce
${steps.length ? steps.map((event, index) => `${index + 1}. [${formatTime(event.timestamp)}] ${escapeMarkdown(describeStep(event))}`).join("\n") : "(No user actions captured.)"}

## JavaScript Errors
${errors.length ? fenced(errors.map(formatError).join("\n\n")) : "(No JavaScript errors captured.)"}

## Console Errors
${consoleErrors.length ? fenced(consoleErrors.map(formatConsoleEvent).join("\n")) : "(No console errors captured.)"}

## Network Errors
${networkErrors.length ? fenced(networkErrors.map(formatNetworkError).join("\n")) : "(No failed network requests captured.)"}

## Network Requests
${networkEvents.length ? fenced(networkEvents.map(formatNetworkRequest).join("\n\n")) : "(No network requests captured.)"}

## Console Log
${consoleEvents.length ? fenced(consoleEvents.map(formatConsoleEvent).join("\n")) : "(No console logs captured.)"}

## Screenshots
${buildMarkdownScreenshots(report, screenshots)}

## Session Replay
${getTotalReplayEvents(report) ? `Captured ${getTotalReplayEvents(report)} replay events. Open the extension replay viewer to watch all clicked tabs or each tab separately.` : "No session replay was captured."}
${report.aiExplanation ? `
## Plain-English Explanation
> ${report.aiExplanation.replace(/\n/g, "\n> ")}
` : ""}
## Machine-readable Report
Download the JSON report from the extension popup to inspect the full report v2 payload, including replay events.`;
}

function buildMarkdownScreenshots(report, screenshots) {
  if (!screenshots.length) {
    return `Screenshot unavailable${report.screenshotError ? `: ${report.screenshotError}` : "."}`;
  }

  return screenshots.map((screenshot, index) => {
    const title = screenshot.title || `Tab ${screenshot.tabId || index + 1}`;
    const url = screenshot.url ? `\nURL: ${screenshot.url}` : "";
    const meta = formatScreenshotMeta(screenshot);
    return `### ${escapeMarkdown(title)}${url}\n${meta}\n\n![screenshot-${index + 1}](${screenshot.dataUrl})`;
  }).join("\n\n");
}
