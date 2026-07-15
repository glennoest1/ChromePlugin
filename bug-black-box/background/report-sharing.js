async function shareReport(reportFromPopup) {
  const report = reportFromPopup || (await chrome.storage.local.get("lastReport")).lastReport;
  if (!report || typeof report !== "object") {
    return { ok: false, error: "EMPTY_REPORT" };
  }

  const baseUrl = await getBackendBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: "MISSING_BACKEND_URL" };
  }

  const body = await gzipJson(report);
  const response = await fetch(buildBackendUrl("/api/reports", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream"
    },
    body
  }).catch(() => {
    throw new Error("NETWORK_ERROR");
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    return { ok: false, error: mapReportShareHttpError(response.status), status: response.status, details: payload };
  }

  const shareId = payload?.shareId || "";
  const shareUrl = buildShareUrl(shareId);
  const shareResult = {
    shareId,
    url: shareUrl,
    expiresAt: payload?.expiresAt || null,
    sharedAt: new Date().toISOString(),
    reportKey: getReportShareKey(report)
  };
  await chrome.storage.local.set({ lastReportShare: shareResult });

  return {
    ok: true,
    ...shareResult
  };
}

function getStoredShareForReport(report, shareResult) {
  if (!report || !shareResult) return null;
  if (shareResult.reportKey !== getReportShareKey(report)) return null;
  return normalizeShareResult(shareResult);
}

function getReportShareKey(report) {
  return [
    report?.version || "",
    report?.rootTabId || "",
    report?.startedAt || "",
    report?.stoppedAt || ""
  ].join("|");
}

async function fetchSharedReport(shareId) {
  const safeShareId = String(shareId || "").trim();
  if (!safeShareId) {
    return { ok: false, error: "MISSING_SHARE_ID" };
  }

  const baseUrl = await getBackendBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: "MISSING_BACKEND_URL" };
  }

  const response = await fetch(buildBackendUrl(`/api/reports/${encodeURIComponent(safeShareId)}`, baseUrl), {
    method: "GET"
  }).catch(() => {
    throw new Error("NETWORK_ERROR");
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    return { ok: false, error: mapReportFetchHttpError(response.status), status: response.status, details: payload };
  }

  if (!payload?.report || typeof payload.report !== "object") {
    return { ok: false, error: "INVALID_SHARED_REPORT" };
  }

  return {
    ok: true,
    shareId: payload.shareId || safeShareId,
    rootUrl: payload.rootUrl || "",
    version: payload.version || "",
    createdAt: payload.createdAt || null,
    expiresAt: payload.expiresAt || null,
    report: payload.report
  };
}

async function getBackendBaseUrl() {
  const { backendConfig } = await chrome.storage.local.get("backendConfig").catch(() => ({}));
  return normalizeBaseUrl(backendConfig?.baseUrl || BACKEND_BASE_URL);
}

function normalizeBaseUrl(value) {
  const baseUrl = String(value || "").trim().replace(/\/+$/, "");
  if (!baseUrl) return "";

  try {
    const parsed = new URL(baseUrl);
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function buildUrl(path, baseUrl) {
  return `${baseUrl}/${String(path || "").replace(/^\/+/, "")}`;
}

function buildBackendUrl(path, baseUrl) {
  return buildUrl(path, baseUrl);
}

function buildShareUrl(shareId) {
  const baseUrl = normalizeBaseUrl(FRONTEND_BASE_URL) || normalizeBaseUrl(BACKEND_BASE_URL);
  return buildUrl(`/api/reports/${encodeURIComponent(shareId || "")}`, baseUrl);
}

function normalizeShareResult(shareResult) {
  const shareId = String(shareResult.shareId || extractShareIdFromUrl(shareResult.url) || "").trim();
  return {
    ...shareResult,
    shareId,
    url: buildShareUrl(shareId)
  };
}

function extractShareIdFromUrl(value) {
  try {
    const parsed = new URL(value);
    const queryId = parsed.searchParams.get("shareId") || parsed.searchParams.get("id");
    if (queryId) return queryId;

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    return pathParts[pathParts.length - 1] || "";
  } catch {
    return "";
  }
}

async function gzipJson(report) {
  if (typeof CompressionStream !== "function") {
    throw new Error("GZIP_UNSUPPORTED");
  }

  const json = JSON.stringify(report);
  const bytes = new TextEncoder().encode(json);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return await new Response(stream).arrayBuffer();
}

async function readJsonResponse(response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mapReportShareHttpError(status) {
  if (status === 400) return "INVALID_REPORT";
  if (status === 413) return "REPORT_TOO_LARGE";
  if (status >= 500) return "SERVER_ERROR";
  return "SHARE_FAILED";
}

function mapReportFetchHttpError(status) {
  if (status === 404) return "REPORT_NOT_FOUND";
  if (status >= 500) return "SERVER_ERROR";
  return "FETCH_REPORT_FAILED";
}
