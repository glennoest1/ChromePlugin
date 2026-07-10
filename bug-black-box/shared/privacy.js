const MAX_CAPTURED_BODY_LENGTH = 2000;
const MAX_CAPTURED_HEADER_LENGTH = 500;
const AI_PROMPT_FIELD_LIMIT = 3000;
const SENSITIVE_FIELD_PATTERN = /password|token|secret|authorization|cookie|api[-_]?key|session|set-cookie/i;

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};

  return Object.entries(headers).reduce((result, [key, value]) => {
    const headerName = stringifyValue(key).toLowerCase();
    if (!headerName) return result;
    result[headerName] = SENSITIVE_FIELD_PATTERN.test(headerName)
      ? "[redacted]"
      : limitText(redactSensitiveText(stringifyValue(value)), MAX_CAPTURED_HEADER_LENGTH);
    return result;
  }, {});
}

function sanitizePayload(value) {
  if (value === undefined || value === null || value === "") return "";
  return limitText(redactSensitiveText(stringifyValue(value)), MAX_CAPTURED_BODY_LENGTH);
}

function redactSensitiveText(text) {
  return String(text)
    .replace(/((?:password|token|secret|authorization|cookie|api[-_]?key|session)\s*[:=]\s*)([^\s,;&]+)/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]");
}

function sanitizeUrl(value) {
  const text = String(value || "");
  if (!text) return "";

  try {
    const url = new URL(text);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
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

function limitText(value, maxLength) {
  const text = stringifyValue(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function limitForAI(value) {
  const text = stringifyValue(value);
  if (text.length <= AI_PROMPT_FIELD_LIMIT) return text;
  return `${text.slice(0, AI_PROMPT_FIELD_LIMIT)}\n...`;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}
