(() => {
  if (window.__bugBlackBoxInjected) return;
  window.__bugBlackBoxInjected = true;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalFetch = window.fetch;
  const originalXhrOpen = window.XMLHttpRequest?.prototype?.open;
  const originalXhrSend = window.XMLHttpRequest?.prototype?.send;
  const originalXhrSetRequestHeader = window.XMLHttpRequest?.prototype?.setRequestHeader;
  const MAX_NETWORK_BODY_LENGTH = 2000;
  const MAX_NETWORK_HEADER_LENGTH = 500;
  const SENSITIVE_FIELD_PATTERN = /password|token|secret|authorization|cookie|api[-_]?key|session|set-cookie/i;

  function safeStringify(value) {
    try {
      if (typeof value === "string") return redactSensitiveText(value);
      if (value instanceof Error) return redactSensitiveText(value.stack || value.message);
      if (value instanceof HTMLInputElement) return `<input type="${value.type || "text"}">`;
      if (value instanceof HTMLTextAreaElement) return "<textarea>";
      if (value instanceof HTMLSelectElement) return "<select>";
      if (value instanceof Element) {
        const id = value.id ? `#${value.id}` : "";
        const classes = typeof value.className === "string" && value.className
          ? "." + value.className.trim().split(/\s+/).slice(0, 3).join(".")
          : "";
        return `<${value.tagName.toLowerCase()}${id}${classes}>`;
      }

      const serialized = JSON.stringify(value, (key, nestedValue) => {
        if (SENSITIVE_FIELD_PATTERN.test(key)) {
          return "[redacted]";
        }
        return nestedValue;
      });
      return serialized === undefined ? String(value) : serialized;
    } catch {
      return String(value);
    }
  }

  function redactSensitiveText(text) {
    return String(text)
      .replace(/((?:password|token|secret|authorization|cookie|api[-_]?key|session)\s*[:=]\s*)([^\s,;&]+)/gi, "$1[redacted]")
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]");
  }

  function forward(level, args) {
    window.postMessage({
      __bugBlackBox: true,
      type: "console",
      level,
      message: args.map(safeStringify).join(" "),
      timestamp: Date.now()
    }, "*");
  }

  console.log = function (...args) {
    forward("log", args);
    originalLog.apply(console, args);
  };

  console.warn = function (...args) {
    forward("warn", args);
    originalWarn.apply(console, args);
  };

  console.error = function (...args) {
    forward("error", args);
    originalError.apply(console, args);
  };

  installNetworkCapture();

  function installNetworkCapture() {
    if (typeof originalFetch === "function") {
      window.fetch = async function (input, init = {}) {
        const startedAt = Date.now();
        const request = normalizeFetchRequest(input, init);

        try {
          const response = await originalFetch.apply(this, arguments);
          postFetchNetworkEvent(request, response, startedAt);
          return response;
        } catch (error) {
          postNetworkEvent({
            source: "fetch",
            ...request,
            statusCode: null,
            durationMs: Date.now() - startedAt,
            error: safeStringify(error),
            timestamp: startedAt
          });
          throw error;
        }
      };
    }

    if (originalXhrOpen && originalXhrSend && originalXhrSetRequestHeader) {
      XMLHttpRequest.prototype.open = function (method, url) {
        this.__bugBlackBoxXhr = {
          method: String(method || "GET").toUpperCase(),
          url: String(url || ""),
          requestHeaders: {},
          startedAt: null
        };
        return originalXhrOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (this.__bugBlackBoxXhr) {
          this.__bugBlackBoxXhr.requestHeaders[String(name || "")] = String(value || "");
        }
        return originalXhrSetRequestHeader.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function (body) {
        const meta = this.__bugBlackBoxXhr || {
          method: "GET",
          url: "",
          requestHeaders: {}
        };
        meta.startedAt = Date.now();
        meta.requestBody = serializeBody(body);
        let finalized = false;

        const finalize = (error = "") => {
          if (finalized) return;
          finalized = true;
          postNetworkEvent({
            source: "xhr",
            method: meta.method,
            url: meta.url,
            requestHeaders: sanitizeHeaders(meta.requestHeaders),
            requestBody: meta.requestBody,
            responseHeaders: parseRawHeaders(this.getAllResponseHeaders?.() || ""),
            responseBody: getXhrResponseBody(this),
            statusCode: Number.isFinite(this.status) ? this.status : null,
            durationMs: Date.now() - meta.startedAt,
            error,
            timestamp: meta.startedAt
          });
        };

        this.addEventListener("loadend", () => finalize(""), { once: true });
        this.addEventListener("error", () => finalize("Network request failed"), { once: true });
        this.addEventListener("abort", () => finalize("Request aborted"), { once: true });

        return originalXhrSend.apply(this, arguments);
      };
    }
  }

  function normalizeFetchRequest(input, init) {
    const requestHeaders = mergeHeaders(
      input instanceof Request ? input.headers : null,
      init?.headers || null
    );

    return {
      method: String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase(),
      url: String(input instanceof Request ? input.url : input || ""),
      requestHeaders: sanitizeHeaders(requestHeaders),
      requestBody: serializeBody(init?.body)
    };
  }

  function postFetchNetworkEvent(request, response, startedAt) {
    const durationMs = Date.now() - startedAt;
    const responseHeaders = sanitizeHeaders(headersToObject(response.headers));

    readResponseBody(response).then((responseBody) => {
      postNetworkEvent({
        source: "fetch",
        ...request,
        responseHeaders,
        responseBody,
        statusCode: response.status,
        durationMs,
        error: "",
        timestamp: startedAt
      });
    }).catch(() => {
      postNetworkEvent({
        source: "fetch",
        ...request,
        responseHeaders,
        responseBody: "",
        statusCode: response.status,
        durationMs,
        error: "",
        timestamp: startedAt
      });
    });
  }

  function postNetworkEvent(payload) {
    window.postMessage({
      __bugBlackBox: true,
      type: "network",
      ...payload
    }, "*");
  }

  function mergeHeaders(...headersList) {
    return headersList.reduce((merged, headers) => ({
      ...merged,
      ...headersToObject(headers)
    }), {});
  }

  function headersToObject(headers) {
    if (!headers) return {};
    if (headers instanceof Headers) {
      const result = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    if (Array.isArray(headers)) {
      return headers.reduce((result, [key, value]) => {
        result[String(key || "")] = String(value || "");
        return result;
      }, {});
    }
    if (typeof headers === "object") return { ...headers };
    return {};
  }

  function parseRawHeaders(rawHeaders) {
    return sanitizeHeaders(String(rawHeaders || "")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .reduce((headers, line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex <= 0) return headers;
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        headers[key] = value;
        return headers;
      }, {}));
  }

  function sanitizeHeaders(headers) {
    return Object.entries(headers || {}).reduce((result, [key, value]) => {
      const headerName = String(key || "").toLowerCase();
      if (!headerName) return result;
      result[headerName] = SENSITIVE_FIELD_PATTERN.test(headerName)
        ? "[redacted]"
        : limitText(redactSensitiveText(String(value ?? "")), MAX_NETWORK_HEADER_LENGTH);
      return result;
    }, {});
  }

  function serializeBody(body) {
    if (body === undefined || body === null || body === "") return "";
    if (typeof body === "string") return limitText(redactSensitiveText(body), MAX_NETWORK_BODY_LENGTH);
    if (body instanceof URLSearchParams) return limitText(redactSensitiveText(body.toString()), MAX_NETWORK_BODY_LENGTH);
    if (body instanceof FormData) return serializeFormData(body);
    if (body instanceof Blob) return `[blob:${body.type || "unknown"}, ${body.size} bytes]`;
    if (body instanceof ArrayBuffer) return `[arraybuffer:${body.byteLength} bytes]`;
    if (ArrayBuffer.isView(body)) return `[typedarray:${body.byteLength} bytes]`;
    return limitText(redactSensitiveText(safeStringify(body)), MAX_NETWORK_BODY_LENGTH);
  }

  function serializeFormData(formData) {
    const fields = [];
    formData.forEach((value, key) => {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
        fields.push(`${key}=[redacted]`);
      } else if (value instanceof File) {
        fields.push(`${key}=[file:${value.name || "unnamed"}, ${value.size} bytes]`);
      } else {
        fields.push(`${key}=${redactSensitiveText(String(value))}`);
      }
    });
    return limitText(fields.join("&"), MAX_NETWORK_BODY_LENGTH);
  }

  function getXhrResponseBody(xhr) {
    if (xhr.responseType && xhr.responseType !== "text") {
      return `[responseType:${xhr.responseType}]`;
    }
    return limitText(redactSensitiveText(xhr.responseText || ""), MAX_NETWORK_BODY_LENGTH);
  }

  async function readResponseBody(response) {
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType && !/json|text|xml|html|javascript|problem\+json/i.test(contentType)) {
      return `[content-type:${contentType}]`;
    }
    const text = await response.clone().text();
    return limitText(redactSensitiveText(text), MAX_NETWORK_BODY_LENGTH);
  }

  function limitText(text, maxLength) {
    const value = String(text ?? "");
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
  }

  window.addEventListener("error", (event) => {
    window.postMessage({
      __bugBlackBox: true,
      type: "jsError",
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack || null,
      timestamp: Date.now()
    }, "*");
  });

  window.addEventListener("unhandledrejection", (event) => {
    window.postMessage({
      __bugBlackBox: true,
      type: "jsError",
      message: "Unhandled Promise Rejection: " + safeStringify(event.reason),
      stack: event.reason?.stack || null,
      timestamp: Date.now()
    }, "*");
  });
})();
