(() => {
  if (window.__bugBlackBoxInjected) return;
  window.__bugBlackBoxInjected = true;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  function safeStringify(value) {
    try {
      if (typeof value === "string") return redactSensitiveText(value);
      if (value instanceof Error) return value.stack || value.message;
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
        if (/password|token|secret|authorization|cookie|api[-_]?key/i.test(key)) {
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
      .replace(/((?:password|token|secret|authorization|cookie|api[-_]?key)\s*[:=]\s*)([^\s,;&]+)/gi, "$1[redacted]")
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
