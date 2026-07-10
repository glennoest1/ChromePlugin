async function ensureContentScripts(tabId) {
  const contentReady = await pingContentScript(tabId);
  const replayReady = await pingReplayScript(tabId);
  if (contentReady && replayReady) return true;

  try {
    if (!contentReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["injected.js"],
        world: "MAIN"
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    }

    if (!replayReady) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["vendor/rrweb.min.js", "session-recorder.js"]
      });
    }
  } catch {
    return false;
  }

  return (await pingContentScript(tabId)) && (await pingReplayScript(tabId));
}

async function ensureRecordersForOpenTabs(rootTabId) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(async (tab) => {
    if (!tab?.id || tab.id === rootTabId) return;
    if (!getRecordablePageInfo(tab.url).recordable) return;
    await ensureContentScripts(tab.id);
  }));
}

function pingContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "bugBlackBoxPing" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(response?.ok));
    });
  });
}

function pingReplayScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "bugBlackBoxReplayPing" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(Boolean(response?.ok && response?.hasRrweb));
    });
  });
}

function getRecordablePageInfo(url) {
  if (!url) return { recordable: false, protocol: "", error: "UNSUPPORTED_PAGE" };
  try {
    const parsed = new URL(url);
    if (["http:", "https:", "file:"].includes(parsed.protocol)) {
      return { recordable: true, protocol: parsed.protocol };
    }
    return { recordable: false, protocol: parsed.protocol, error: "RESTRICTED_PAGE" };
  } catch {
    return { recordable: false, protocol: "", error: "UNSUPPORTED_PAGE" };
  }
}
