const STATIC_RESOURCE_PATTERN = /\.(?:avif|bmp|css|gif|ico|jpe?g|js|map|mp3|mp4|otf|png|svg|ttf|webm|webp|woff2?)(?:[?#].*)?$/i;
const NOISY_HOST_PATTERN = /(?:^|\.)((google-analytics|googletagmanager|doubleclick|facebook|hotjar|sentry|segment|mixpanel|clarity|intercom|fullstory)\.com|analytics\.google\.com)$/i;

function sanitizeEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") return null;

  const timestamp = Number.isFinite(rawEvent.timestamp)
    ? rawEvent.timestamp
    : Date.now();

  if (rawEvent.type === "tabFocus" || rawEvent.type === "tabBlur") {
    return {
      type: rawEvent.type,
      windowId: numberOrNull(rawEvent.windowId),
      timestamp
    };
  }

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

  if (rawEvent.type === "network") {
    return {
      type: "network",
      source: stringifyValue(rawEvent.source || ""),
      method: stringifyValue(rawEvent.method || "GET").toUpperCase(),
      url: sanitizeUrl(rawEvent.url || ""),
      requestHeaders: sanitizeHeaders(rawEvent.requestHeaders),
      requestBody: sanitizePayload(rawEvent.requestBody),
      responseHeaders: sanitizeHeaders(rawEvent.responseHeaders),
      responseBody: sanitizePayload(rawEvent.responseBody),
      statusCode: numberOrNull(rawEvent.statusCode),
      durationMs: numberOrNull(rawEvent.durationMs),
      error: stringifyValue(rawEvent.error || ""),
      timestamp
    };
  }

  if (rawEvent.type === "networkError") {
    return {
      type: "networkError",
      method: stringifyValue(rawEvent.method || "GET"),
      url: sanitizeUrl(rawEvent.url || ""),
      requestHeaders: sanitizeHeaders(rawEvent.requestHeaders),
      requestBody: sanitizePayload(rawEvent.requestBody),
      responseHeaders: sanitizeHeaders(rawEvent.responseHeaders),
      responseBody: sanitizePayload(rawEvent.responseBody),
      statusCode: numberOrNull(rawEvent.statusCode),
      durationMs: numberOrNull(rawEvent.durationMs),
      error: stringifyValue(rawEvent.error || ""),
      timestamp
    };
  }

  return null;
}

function shouldKeepNetworkEvent(event) {
  const statusCode = Number(event.statusCode);
  const method = stringifyValue(event.method || "GET").toUpperCase();

  if (event.triggeredByActionId) return true;
  if (event.error) return true;
  if (Number.isFinite(statusCode) && statusCode >= 400) return true;
  if (method !== "GET" && method !== "HEAD") return true;
  if (event.requestBody) return true;
  if (isNoisyNetworkUrl(event.url)) return false;

  return false;
}

function shouldKeepConsoleEvent(event) {
  if (event.level === "error" || event.level === "warn") return true;
  return Boolean(event.triggeredByActionId);
}

function isNoisyNetworkUrl(url) {
  const value = stringifyValue(url);
  if (!value) return true;
  if (/^(?:chrome|chrome-extension|moz-extension|edge|about|data|blob):/i.test(value)) return true;

  try {
    const parsed = new URL(value);
    if (STATIC_RESOURCE_PATTERN.test(parsed.pathname)) return true;
    if (NOISY_HOST_PATTERN.test(parsed.hostname)) return true;
  } catch {
    return STATIC_RESOURCE_PATTERN.test(value);
  }

  return false;
}
