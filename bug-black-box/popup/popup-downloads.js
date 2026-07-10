function downloadReport(report) {
  const markdown = buildMarkdown(report);
  downloadTextFile(
    markdown,
    `bug-report-${formatFileDate(new Date(report.stoppedAt || Date.now()))}.md`,
    "text/markdown;charset=utf-8"
  );
}

function downloadJsonReport(report) {
  const json = JSON.stringify(buildJsonDownloadReport(report), null, 2);
  downloadTextFile(
    json,
    `bug-report-${formatFileDate(new Date(report.stoppedAt || Date.now()))}.json`,
    "application/json;charset=utf-8"
  );
}

function downloadTextFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
