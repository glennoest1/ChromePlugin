const MAX_EVENTS = 500;
const MAX_REPLAY_EVENTS = 5000;
const MIN_REPLAY_EVENTS = 25;
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const AI_PROMPT_FIELD_LIMIT = 3000;

let writeQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("recordingState").then(({ recordingState }) => {
    if (!recordingState) {
      return chrome.storage.local.set({
        recordingState: { isRecording: false }
      });
    }
    return undefined;
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.action) return false;

  runMessageHandler(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error.message || "UNKNOWN_ERROR"
      });
    });

  return true;
});

chrome.webRequest.onCompleted.addListener((details) => {
  if (details.statusCode < 400) return;
  recordNetworkError({
    method: details.method,
    url: details.url,
    statusCode: details.statusCode,
    error: null,
    timestamp: details.timeStamp || Date.now()
  }, details.tabId);
}, { urls: ["<all_urls>"] });

chrome.webRequest.onErrorOccurred.addListener((details) => {
  recordNetworkError({
    method: details.method,
    url: details.url,
    statusCode: null,
    error: details.error || "Network request failed",
    timestamp: details.timeStamp || Date.now()
  }, details.tabId);
}, { urls: ["<all_urls>"] });

async function runMessageHandler(message, sender) {
  switch (message.action) {
    case "startRecording":
      return startRecording();
    case "stopRecording":
      return stopRecording();
    case "recordEvent":
      if (!sender.tab?.id) return { ok: true, ignored: true };
      await enqueueAppendEvent(message.payload, sender.tab.id);
      return { ok: true };
    case "recordReplayEvents":
      if (!sender.tab?.id) return { ok: true, ignored: true };
      await enqueueAppendReplayEvents(message.events, sender.tab.id);
      return { ok: true };
    case "getReplayEvents":
      return getReplayEvents();
    case "getStatus":
      return getStatus();
    case "resetReport":
      await chrome.storage.local.set({
        recordingState: { isRecording: false },
        eventBuffer: [],
        replayEvents: [],
        replayStatus: null,
        lastReport: null
      });
      return { ok: true };
    case "explainReport":
      return explainLastReport(message.report || null);
    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}

async function startRecording() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "NO_ACTIVE_TAB" };
  }

  const pageInfo = getRecordablePageInfo(tab.url);
  if (!pageInfo.recordable) {
    return { ok: false, error: pageInfo.error, tabUrl: tab.url || "" };
  }

  const contentReady = await ensureContentScripts(tab.id);
  if (!contentReady) {
    return {
      ok: false,
      error: pageInfo.protocol === "file:" ? "FILE_ACCESS_REQUIRED" : "INJECTION_FAILED",
      tabUrl: tab.url || ""
    };
  }

  const now = Date.now();
  const recordingState = {
    isRecording: true,
    startedAt: now,
    tabId: tab.id,
    tabUrl: sanitizeUrl(tab.url),
    tabTitle: tab.title || ""
  };

  await chrome.storage.local.set({
    recordingState,
    eventBuffer: [],
    replayEvents: [],
    replayStatus: {
      started: false,
      startError: null,
      lastBatchAt: null,
      lastBatchSize: 0,
      storageError: null
    },
    lastReport: null
  });

  const replayStart = await sendTabMessage(tab.id, { action: "startSessionReplay" });
  await chrome.storage.local.set({
    replayStatus: {
      started: Boolean(replayStart?.ok && replayStart?.recording),
      startError: replayStart?.error || null,
      lastBatchAt: null,
      lastBatchSize: 0,
      storageError: null
    }
  });

  return { ok: true, recordingState };
}

async function stopRecording() {
  let { recordingState } = await chrome.storage.local.get("recordingState");

  if (!recordingState?.isRecording) {
    const { lastReport } = await chrome.storage.local.get("lastReport");
    return { ok: true, report: lastReport || null };
  }

  const stoppedAt = Date.now();
  await sendTabMessage(recordingState.tabId, { action: "stopSessionReplay" });
  await wait(150);
  await writeQueue.catch(() => {});
  const stored = await chrome.storage.local.get([
    "recordingState",
    "eventBuffer",
    "replayEvents",
    "replayStatus"
  ]);
  recordingState = stored.recordingState || recordingState;
  const eventBuffer = stored.eventBuffer || [];
  const replayEvents = Array.isArray(stored.replayEvents) ? stored.replayEvents : [];
  const replayStatus = stored.replayStatus || null;

  await chrome.storage.local.set({
    recordingState: {
      ...recordingState,
      isRecording: false,
      stoppedAt
    }
  });

  let recordedTab = null;
  let captureResult = { dataUrl: null, error: null };

  try {
    recordedTab = await chrome.tabs.get(recordingState.tabId);
    if (recordedTab?.id && recordedTab.windowId !== undefined) {
      await chrome.tabs.update(recordedTab.id, { active: true });
      captureResult = await captureVisibleTab(recordedTab.windowId);
    }
  } catch (error) {
    captureResult = { dataUrl: null, error: error.message || "Capture failed" };
  }

  const report = {
    tabUrl: sanitizeUrl(recordedTab?.url || recordingState.tabUrl || ""),
    tabTitle: recordedTab?.title || recordingState.tabTitle || "",
    startedAt: recordingState.startedAt,
    stoppedAt,
    durationSeconds: Math.max(0, Math.round((stoppedAt - recordingState.startedAt) / 1000)),
    events: Array.isArray(eventBuffer) ? eventBuffer : [],
    replayEventCount: replayEvents.length,
    replayStatus,
    screenshotBase64: captureResult.dataUrl,
    screenshotError: captureResult.error,
    aiExplanation: null
  };

  await chrome.storage.local.set({
    lastReport: report
  });

  return { ok: true, report };
}

async function getReplayEvents() {
  const { replayEvents = [] } = await chrome.storage.local.get("replayEvents");
  return {
    ok: true,
    replayEvents: Array.isArray(replayEvents) ? replayEvents : []
  };
}

async function getStatus() {
  const { recordingState, eventBuffer = [], lastReport, apiConfig } =
    await chrome.storage.local.get(["recordingState", "eventBuffer", "lastReport", "apiConfig"]);

  return {
    ok: true,
    recordingState: recordingState || { isRecording: false },
    lastReport: lastReport || null,
    counts: countEvents(eventBuffer),
    hasApiKey: Boolean(apiConfig?.apiKey)
  };
}

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
  writeQueue = writeQueue.catch(() => {}).then(() => appendEvent(rawEvent, tabId));
  return writeQueue;
}

function enqueueAppendReplayEvents(events, tabId) {
  writeQueue = writeQueue.catch(() => {}).then(() => appendReplayEvents(events, tabId));
  return writeQueue;
}

async function appendEvent(rawEvent, tabId) {
  const event = sanitizeEvent(rawEvent);
  if (!event) return;

  const { recordingState, eventBuffer = [] } = await chrome.storage.local.get([
    "recordingState",
    "eventBuffer"
  ]);

  if (!recordingState?.isRecording) return;
  if (recordingState.tabId !== tabId) return;

  const nextBuffer = Array.isArray(eventBuffer)
    ? [...eventBuffer, event].slice(-MAX_EVENTS)
    : [event];

  await chrome.storage.local.set({ eventBuffer: nextBuffer });
}

async function appendReplayEvents(events, tabId) {
  if (!Array.isArray(events) || !events.length) return;

  const { recordingState, replayEvents = [] } = await chrome.storage.local.get([
    "recordingState",
    "replayEvents"
  ]);

  if (!recordingState?.isRecording) return;
  if (recordingState.tabId !== tabId) return;

  const nextReplayEvents = Array.isArray(replayEvents)
    ? [...replayEvents, ...events].slice(-MAX_REPLAY_EVENTS)
    : events.slice(-MAX_REPLAY_EVENTS);

  const storageResult = await setReplayEventsWithFallback(nextReplayEvents);
  await chrome.storage.local.set({
    replayStatus: {
      ...(await getReplayStatus()),
      lastBatchAt: Date.now(),
      lastBatchSize: events.length,
      storageError: storageResult.ok ? null : storageResult.error
    }
  });
}

function sendTabMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(() => null);
}

async function setReplayEventsWithFallback(events) {
  let nextEvents = events;

  while (nextEvents.length) {
    try {
      await chrome.storage.local.set({ replayEvents: nextEvents });
      return { ok: true };
    } catch (error) {
      if (nextEvents.length < MIN_REPLAY_EVENTS) {
        return {
          ok: false,
          error: error.message || "REPLAY_STORAGE_QUOTA"
        };
      }
      nextEvents = nextEvents.slice(Math.floor(nextEvents.length / 2));
    }
  }

  await chrome.storage.local.set({ replayEvents: [] });
  return { ok: true };
}

async function getReplayStatus() {
  const { replayStatus } = await chrome.storage.local.get("replayStatus");
  return replayStatus || {
    started: false,
    startError: null,
    lastBatchAt: null,
    lastBatchSize: 0,
    storageError: null
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function sanitizeEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") return null;

  const timestamp = Number.isFinite(rawEvent.timestamp)
    ? rawEvent.timestamp
    : Date.now();

  if (rawEvent.type === "console") {
    const allowedLevel = ["log", "warn", "error"].includes(rawEvent.level)
      ? rawEvent.level
      : "log";
    return {
      type: "console",
      level: allowedLevel,
      message: stringifyValue(rawEvent.message),
      timestamp
    };
  }

  if (rawEvent.type === "click" || rawEvent.type === "submit") {
    return {
      type: rawEvent.type,
      selector: stringifyValue(rawEvent.selector),
      text: stringifyValue(rawEvent.text),
      timestamp
    };
  }

  if (rawEvent.type === "jsError") {
    return {
      type: "jsError",
      message: stringifyValue(rawEvent.message),
      source: sanitizeUrl(rawEvent.source || ""),
      lineno: numberOrNull(rawEvent.lineno),
      colno: numberOrNull(rawEvent.colno),
      stack: stringifyValue(rawEvent.stack || ""),
      timestamp
    };
  }

  if (rawEvent.type === "networkError") {
    return {
      type: "networkError",
      method: stringifyValue(rawEvent.method || "GET"),
      url: sanitizeUrl(rawEvent.url || ""),
      statusCode: numberOrNull(rawEvent.statusCode),
      error: stringifyValue(rawEvent.error || ""),
      timestamp
    };
  }

  return null;
}

function countEvents(events) {
  const counts = {
    console: 0,
    consoleError: 0,
    jsError: 0,
    click: 0,
    submit: 0,
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

async function explainLastReport(reportFromPopup) {
  const { apiConfig, lastReport } = await chrome.storage.local.get(["apiConfig", "lastReport"]);
  const report = reportFromPopup || lastReport;

  if (!apiConfig?.apiKey) throw new Error("MISSING_API_KEY");
  if (!report?.events?.length) throw new Error("EMPTY_REPORT");
  if (!hasExplainableError(report)) throw new Error("NO_ERRORS");

  const explanation = await explainWithAI(apiConfig.apiKey, report);
  const updatedReport = {
    ...report,
    aiExplanation: explanation
  };

  await chrome.storage.local.set({ lastReport: updatedReport });
  return { ok: true, explanation, report: updatedReport };
}

function hasExplainableError(report) {
  return report.events.some((event) =>
    event.type === "jsError" ||
    (event.type === "console" && event.level === "error")
  );
}

async function explainWithAI(apiKey, report) {
  const prompt = buildExplainPrompt(report);
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      maxOutputTokens: 30000,
      temperature: 0.2
    }
  };
  let response;

  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
  } catch {
    throw new Error("NETWORK_ERROR");
  }

  if (response.status === 401 || response.status === 403) throw new Error("INVALID_API_KEY");
  if (response.status === 429) throw new Error("RATE_LIMIT");
  if (!response.ok) throw new Error("UNKNOWN_ERROR");

  const data = await response.json();

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("EMPTY_RESPONSE");

  return text;
}

function buildExplainPrompt(report) {
  const errors = report.events
    .filter((event) => event.type === "jsError")
    .map((event) => `- ${limitForAI(event.message)}${event.stack ? "\n  Stack: " + limitForAI(event.stack) : ""}`)
    .join("\n");

  const consoleErrors = report.events
    .filter((event) => event.type === "console" && event.level === "error")
    .map((event) => `- ${limitForAI(event.message)}`)
    .join("\n");

  const networkErrors = report.events
    .filter((event) => event.type === "networkError")
    .map((event) => `- ${event.method} ${limitForAI(event.url)} ${event.statusCode ? "status " + event.statusCode : limitForAI(event.error)}`)
    .join("\n");

  const steps = report.events
    .filter((event) => event.type === "click" || event.type === "submit")
    .map((event, index) => `${index + 1}. ${event.type === "submit" ? "Submitted" : "Clicked"} "${event.text || event.selector}"`)
    .join("\n");

  return `Bạn là trợ lý debug giúp giải thích lỗi kỹ thuật bằng ngôn ngữ đơn giản cho PM, QA hoặc người không chuyên sâu kỹ thuật.
Dựa trên thông tin bên dưới, hãy viết một đoạn giải thích ngắn 3-5 câu bằng tiếng Việt về chuyện gì đã xảy ra.
Không lặp lại nguyên văn log, không thêm tiêu đề, và tập trung vào nguyên nhân ở mức khái niệm.

Các bước người dùng đã thao tác:
${steps || "(không có dữ liệu)"}

Lỗi JavaScript phát hiện được:
${errors || "(không có lỗi JS)"}

Console error khác:
${consoleErrors || "(không có)"}

Network request lỗi:
${networkErrors || "(không có)"}

Chỉ trả lời đoạn giải thích.`;
}

function sanitizeUrl(value) {
  const text = String(value || "");
  if (!text) return "";

  try {
    const url = new URL(text);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/password|token|secret|authorization|cookie|api[-_]?key|session/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.toString();
  } catch {
    return text.split("#")[0];
  }
}

function stringifyValue(value) {
  return String(value ?? "");
}

function limitForAI(value) {
  const text = stringifyValue(value);
  if (text.length <= AI_PROMPT_FIELD_LIMIT) return text;
  return `${text.slice(0, AI_PROMPT_FIELD_LIMIT)}\n...`;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}
