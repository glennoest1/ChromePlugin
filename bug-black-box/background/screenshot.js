const ERROR_SCREENSHOT_COOLDOWN_MS = 10000;

function captureVisibleTab(windowId) {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        resolve({
          dataUrl: null,
          error: chrome.runtime.lastError.message || "Unable to capture screenshot"
        });
        return;
      }
      resolve({ dataUrl, error: null });
    });
  });
}

async function captureTabScreenshot(tabId) {
  const targetTab = await chrome.tabs.get(tabId);
  if (!targetTab?.id || targetTab.windowId === undefined) {
    return { dataUrl: null, error: "Root tab is not available; screenshot skipped." };
  }

  const [previousActiveTab] = await chrome.tabs.query({
    active: true,
    windowId: targetTab.windowId
  });

  try {
    if (previousActiveTab?.id !== targetTab.id) {
      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true }).catch(() => { });
      await wait(250);
    }

    return await captureVisibleTab(targetTab.windowId);
  } finally {
    if (previousActiveTab?.id && previousActiveTab.id !== targetTab.id) {
      await chrome.tabs.update(previousActiveTab.id, { active: true }).catch(() => { });
    }
  }
}

async function captureActiveTabScreenshot(tabId) {
  const targetTab = await chrome.tabs.get(tabId).catch(() => null);
  if (!targetTab?.id || targetTab.windowId === undefined) {
    return { dataUrl: null, error: "Tab is not available; screenshot skipped." };
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    windowId: targetTab.windowId
  });

  if (activeTab?.id !== targetTab.id) {
    return { dataUrl: null, error: "Tab is not active; screenshot skipped." };
  }

  return captureVisibleTab(targetTab.windowId);
}

async function maybeCaptureErrorScreenshot(tabId, event) {
  const severity = getScreenshotSeverity(event);
  if (!severity) return;

  const tabKey = String(tabId);
  const { errorScreenshotsByTab = {} } = await chrome.storage.local.get("errorScreenshotsByTab");
  const existing = errorScreenshotsByTab[tabKey] || null;
  const now = Date.now();

  if (existing?.dataUrl) {
    const existingRank = getSeverityRank(existing.severity);
    const nextRank = getSeverityRank(severity);
    const isHigherSeverity = nextRank > existingRank;
    const isCoolingDown = now - Number(existing.capturedAt || 0) < ERROR_SCREENSHOT_COOLDOWN_MS;
    if (!isHigherSeverity || isCoolingDown) return;
  }

  const captureResult = await captureActiveTabScreenshot(tabId);
  if (!captureResult.dataUrl) return;

  const tab = await getTabOrNull(tabId);
  await chrome.storage.local.set({
    errorScreenshotsByTab: {
      ...errorScreenshotsByTab,
      [tabKey]: {
        dataUrl: captureResult.dataUrl,
        error: null,
        reason: "error",
        eventType: event.type,
        severity,
        capturedAt: now,
        url: sanitizeUrl(tab?.url || ""),
        title: tab?.title || ""
      }
    }
  });
}

function shouldCaptureScreenshotForEvent(event) {
  return Boolean(getScreenshotSeverity(event));
}

function getScreenshotSeverity(event) {
  if (event?.type === "jsError") return "jsError";
  if (event?.type === "networkError") return "networkError";
  if (event?.type === "console" && event.level === "error") return "consoleError";
  return null;
}

function getSeverityRank(severity) {
  if (severity === "jsError") return 3;
  if (severity === "networkError") return 2;
  if (severity === "consoleError") return 1;
  return 0;
}
