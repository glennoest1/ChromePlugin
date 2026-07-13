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
  const title = rootTab.title || rootTab.url || report.tabTitle || report.tabUrl || mdT("unknownPage");
  const summary = report.summary || {};
  const screenshots = getReportScreenshots(report);

  return `# ${mdT("reportTitle")} - ${escapeMarkdown(title)}

**${mdT("recordedAt")}:** ${formatDateTime(report.startedAt)}
**${mdT("mode")}:** ${MODE_LABELS[normalizeMode(report.mode)] || bbbT("currentTab")}
**${mdT("rootUrl")}:** ${rootTab.url || report.tabUrl || mdT("unknown")}
**${mdT("capturedTabs")}:** ${summary.tabCount || tabs.length}
**${mdT("totalDebugEvents")}:** ${summary.totalEvents ?? events.length}
**${mdT("totalReplayEvents")}:** ${summary.totalReplayEvents ?? report.replayEventCount ?? 0}
**${mdT("recordingDuration")}:** ${report.durationSeconds || 0} ${mdT("seconds")}

## ${mdT("capturedTabsHeading")}
${tabs.length ? tabs.map((tab, index) => `${index + 1}. ${escapeMarkdown(tab.title || bbbT("untitledPage"))} - ${tab.url || mdT("unknown")} (${mdT("tabEventSummary", { events: (tab.events || []).length, replay: getTabReplayEventCount(tab) })})`).join("\n") : mdT("noTabsCapturedMd")}

## ${mdT("stepsHeading")}
${steps.length ? steps.map((event, index) => `${index + 1}. [${formatTime(event.timestamp)}] ${escapeMarkdown(describeStep(event))}`).join("\n") : mdT("noUserActionsMd")}

## ${mdT("jsErrorsHeading")}
${errors.length ? fenced(errors.map(formatError).join("\n\n")) : mdT("noJsErrorsMd")}

## ${mdT("consoleErrorsHeading")}
${consoleErrors.length ? fenced(consoleErrors.map(formatConsoleEvent).join("\n")) : mdT("noConsoleErrorsMd")}

## ${mdT("networkErrorsHeading")}
${networkErrors.length ? fenced(networkErrors.map(formatNetworkError).join("\n")) : mdT("noNetworkErrorsMd")}

## ${mdT("networkRequestsHeading")}
${networkEvents.length ? fenced(networkEvents.map(formatNetworkRequest).join("\n\n")) : mdT("noNetworkRequestsMd")}

## ${mdT("consoleLogHeading")}
${consoleEvents.length ? fenced(consoleEvents.map(formatConsoleEvent).join("\n")) : mdT("noConsoleLogsMd")}

## ${mdT("screenshotsHeading")}
${buildMarkdownScreenshots(report, screenshots)}

## ${mdT("sessionReplayHeading")}
${getTotalReplayEvents(report) ? mdT("replayCapturedMd", { count: getTotalReplayEvents(report) }) : mdT("noReplayMd")}
${report.aiExplanation ? `
## ${mdT("aiExplanationHeading")}
> ${report.aiExplanation.replace(/\n/g, "\n> ")}
` : ""}
## ${mdT("machineReadableHeading")}
${mdT("machineReadableText")}`;
}

function buildMarkdownScreenshots(report, screenshots) {
  if (!screenshots.length) {
    return report.screenshotError
      ? mdT("screenshotUnavailableWithReason", { reason: report.screenshotError })
      : mdT("screenshotUnavailable");
  }

  return screenshots.map((screenshot, index) => {
    const title = screenshot.title || `${bbbT("tabs")} ${screenshot.tabId || index + 1}`;
    const url = screenshot.url ? `\nURL: ${screenshot.url}` : "";
    const meta = formatScreenshotMeta(screenshot);
    return `### ${escapeMarkdown(title)}${url}\n${meta}\n\n![screenshot-${index + 1}](${screenshot.dataUrl})`;
  }).join("\n\n");
}

function mdT(key, params = {}) {
  const value = bbbT(`md_${key}`, params);
  return value === `md_${key}` ? key : value;
}
