import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { COPY, LANGUAGE_KEY, normalizeLanguage } from "./copy";
import iconUrl from "../icon128.png";
import "../styles.css";

const THEME_KEY = "bbb-web-theme";
const REPORT_API_BASE_URL = (import.meta.env.VITE_REPORT_API_BASE_URL || "https://chromepluginbackend.onrender.com").replace(/\/+$/, "");
const JSON_PREVIEW_MAX_ARRAY_ITEMS = 20;
const JSON_PREVIEW_MAX_OBJECT_KEYS = 80;
const JSON_PREVIEW_MAX_STRING_LENGTH = 300;
const JSON_PREVIEW_MAX_OUTPUT_LENGTH = 90000;
const REPORT_PREVIEW_MAX_EVENTS = 30;
const JSON_PREVIEW_HEAVY_KEYS = new Set(["dataUrl", "screenshotBase64"]);

function getInitialLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY) || navigator.language);
  } catch (err) {
    return "en";
  }
}

function getSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : getSystemTheme();
  } catch (err) {
    return getSystemTheme();
  }
}

function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return [path, navigate];
}

function App() {
  const [path, navigate] = useRoute();
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);
  const copy = useMemo(() => COPY[language] || COPY.en, [language]);
  const isPrivacyPage = path === "/privacy";
  const isReportPage = isReportRoute(path);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = isPrivacyPage
      ? `${copy.policyTitle} - Bug Black Box`
      : isReportPage
        ? `${copy.reportDocumentTitle} - Bug Black Box`
        : copy.indexTitle;
    document
      .querySelector("meta[name='description']")
      ?.setAttribute("content", isPrivacyPage ? copy.policyLead : isReportPage ? copy.reportMetaDescription : copy.indexDescription);
  }, [copy, isPrivacyPage, isReportPage, language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const updateLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    try {
      localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    } catch (err) {
      // Keep the in-memory language when storage is unavailable.
    }
  };

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return (
    <>
      <Header
        copy={copy}
        iconUrl={iconUrl}
        isDark={theme === "dark"}
        isPrivacyPage={isPrivacyPage}
        isReportPage={isReportPage}
        language={language}
        navigate={navigate}
        onLanguageChange={updateLanguage}
        onThemeToggle={toggleTheme}
      />
      {isPrivacyPage ? (
        <PrivacyPage copy={copy} />
      ) : isReportPage ? (
        <ReportPage copy={copy} path={path} navigate={navigate} />
      ) : (
        <HomePage copy={copy} navigate={navigate} />
      )}
      {!isPrivacyPage && !isReportPage && <footer>{copy.footer}</footer>}
    </>
  );
}

function Header({ copy, iconUrl, isDark, isPrivacyPage, isReportPage, language, navigate, onLanguageChange, onThemeToggle }) {
  const goHome = (event) => {
    event.preventDefault();
    navigate("/");
  };

  const goPrivacy = (event) => {
    event.preventDefault();
    navigate("/privacy");
  };

  const goReports = (event) => {
    event.preventDefault();
    navigate("/reports");
  };

  const isUtilityPage = isPrivacyPage || isReportPage;

  return (
    <header className="site-header">
      <div className={`topbar${isPrivacyPage ? "" : " topbar-wide"}`}>
        <a className="brand" href="/" aria-label={copy.brandHomeLabel} onClick={goHome}>
          <img src={iconUrl} alt="" />
          <span>Bug Black Box</span>
        </a>
        <div className="nav-actions">
          {isUtilityPage ? (
            <>
              <a href="/" onClick={goHome}>
                {copy.backWebsite}
              </a>
              <a className="header-report-link" href="/reports" onClick={goReports}>
                {copy.navReports}
              </a>
            </>
          ) : (
            <nav aria-label={copy.primaryNavLabel}>
              <a href="#features">{copy.navFeatures}</a>
              <a href="#privacy">{copy.navPrivacy}</a>
              <a href="/privacy" onClick={goPrivacy}>
                {copy.navPolicy}
              </a>
              <a className="header-report-link" href="/reports" onClick={goReports}>
                {copy.navReports}
              </a>
            </nav>
          )}
          <label className="language-control">
            <span>{copy.languageLabel}</span>
            <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
              <option value="en">{copy.english}</option>
              <option value="vi">{copy.vietnamese}</option>
              <option value="zh">{copy.chinese}</option>
            </select>
          </label>
          <button
            className="theme-toggle"
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? copy.useLight : copy.useDark}
            onClick={onThemeToggle}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

function ReportPage({ copy, path, navigate }) {
  const urlShareId = getShareIdFromCurrentUrl();
  const [shareId, setShareId] = useState(urlShareId);
  const [loadedShareId, setLoadedShareId] = useState("");
  const [reportPayload, setReportPayload] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const jsonPreview = useMemo(() => reportPayload ? buildJsonPreview(reportPayload, copy) : null, [copy, reportPayload]);
  const screenshots = useMemo(() => reportPayload ? extractReportScreenshots(reportPayload, copy) : [], [copy, reportPayload]);
  const hasDownloadableReport = Boolean(reportPayload);

  useEffect(() => {
    const nextShareId = getShareIdFromCurrentUrl();
    setShareId(nextShareId);
    if (nextShareId) {
      loadReport(nextShareId);
    }
  }, [path]);

  const submitReport = (event) => {
    event.preventDefault();
    const nextShareId = shareId.trim();
    if (!nextShareId) {
      setError(copy.reportEnterShareId);
      setReportPayload(null);
      return;
    }

    navigate(`/reports/${encodeURIComponent(nextShareId)}`);
    loadReport(nextShareId);
  };

  const loadReport = async (nextShareId) => {
    const safeShareId = String(nextShareId || "").trim();
    if (!safeShareId) return;

    setIsLoading(true);
    setError("");
    setReportPayload(null);
    setLoadedShareId(safeShareId);

    try {
      const response = await fetch(buildReportApiUrl(safeShareId), { method: "GET" });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `${copy.reportRequestFailed} ${response.status}`);
      }

      setReportPayload(payload);
    } catch (err) {
      setError(err instanceof SyntaxError ? copy.reportInvalidJson : err.message || copy.reportLoadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadJson = () => {
    if (!reportPayload) return;
    downloadJsonReportPayload(reportPayload, loadedShareId);
  };

  return (
    <main className="report-main">
      <section className="report-hero">
        <p className="eyebrow">{copy.reportEyebrow}</p>
        <h1>{copy.reportTitle}</h1>
        <p className="lead">{copy.reportLead}</p>
        <form className="report-search" onSubmit={submitReport}>
          <label className="report-search-label" htmlFor="shareIdInput">
            {copy.reportShareIdLabel}
          </label>
          <div className="report-search-row">
            <input
              id="shareIdInput"
              type="text"
              value={shareId}
              onChange={(event) => setShareId(event.target.value)}
              placeholder={copy.reportPlaceholder}
              autoComplete="off"
              spellCheck="false"
            />
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? copy.reportLoading : copy.reportLoad}
            </button>
          </div>
        </form>
      </section>

      {screenshots.length > 0 && (
        <section className="screenshot-shell" aria-label={copy.reportScreenshotsAriaLabel}>
          <div className="screenshot-head">
            <span>{copy.reportScreenshotsTitle}</span>
            <span>{formatCopy(copy.reportScreenshotsRendered, { count: screenshots.length })}</span>
          </div>
          <div className="screenshot-grid">
            {screenshots.map((screenshot, index) => (
              <figure className="screenshot-card" key={screenshot.id || `${screenshot.tabId}-${index}`}>
                <img
                  src={screenshot.dataUrl}
                  alt={screenshot.title || formatCopy(copy.reportScreenshotAlt, { index: index + 1 })}
                  loading="lazy"
                />
                <figcaption>
                  <strong>{screenshot.title || formatCopy(copy.reportScreenshotAlt, { index: index + 1 })}</strong>
                  <span>
                    {screenshot.reason || copy.reportScreenshotCaptured}
                    {screenshot.tabId ? ` · ${formatCopy(copy.reportScreenshotTab, { tabId: screenshot.tabId })}` : ""}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="json-shell" aria-live="polite">
        <div className="json-head">
          <span>{loadedShareId ? `shareId: ${loadedShareId}` : copy.reportNoLoaded}</span>
          <div className="json-head-actions">
            <span>{isLoading ? copy.reportFetching : reportPayload ? copy.reportJsonPreviewStatus : copy.reportReady}</span>
            <button className="json-download-button" type="button" onClick={downloadJson} disabled={!hasDownloadableReport}>
              {copy.reportDownloadJson}
            </button>
          </div>
        </div>
        {error ? (
          <p className="json-message json-error">{error}</p>
        ) : reportPayload ? (
          <>
            <p className="json-note">
              {copy.reportJsonPreviewNote}
              {jsonPreview?.stats?.omittedFields ? ` ${formatCopy(copy.reportJsonOmittedFields, { count: jsonPreview.stats.omittedFields })}` : ""}
              {jsonPreview?.stats?.truncatedArrays ? ` ${formatCopy(copy.reportJsonTruncatedArrays, { count: jsonPreview.stats.truncatedArrays })}` : ""}
              {jsonPreview?.stats?.omittedEvents ? ` ${formatCopy(copy.reportJsonOmittedEvents, { count: jsonPreview.stats.omittedEvents })}` : ""}
            </p>
            <pre className="json-viewer">{jsonPreview?.text || ""}</pre>
          </>
        ) : (
          <p className="json-message">{copy.reportEmptyMessage}</p>
        )}
      </section>
    </main>
  );
}

function HomePage({ copy, navigate }) {
  const goPrivacy = (event) => {
    event.preventDefault();
    navigate("/privacy");
  };

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>Bug Black Box</h1>
          <p className="lead">{copy.lead}</p>
          <div className="actions">
            <a className="btn btn-primary" href="#" aria-label={copy.addChrome}>
              {copy.addChrome}
            </a>
            <a className="btn" href="/privacy" onClick={goPrivacy}>
              {copy.privacyPolicy}
            </a>
          </div>
        </div>

        <div className="terminal" aria-label={copy.terminalPreviewLabel}>
          <div className="terminal-head">
            <span className="dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>bug-report.md</span>
          </div>
          <pre className="report">{copy.terminal}</pre>
        </div>
      </section>

      <section id="features" className="band">
        <div className="inner">
          <h2>{copy.featuresTitle}</h2>
          <div className="grid">
            {copy.features.map(([title, text]) => (
              <article className="card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="band">
        <div className="inner split">
          <div>
            <h2>{copy.privacyTitle}</h2>
            <p className="lead">{copy.privacyLead}</p>
          </div>
          <dl className="facts">
            {copy.facts.map(([title, text]) => (
              <div className="fact" key={title}>
                <dt>{title}</dt>
                <dd>{renderInlineCode(text)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="band">
        <div className="inner split">
          <div>
            <h2>{copy.permissionTitle}</h2>
            <p className="lead">{copy.permissionLead}</p>
          </div>
          <div className="permissions">
            {copy.permissions.map(([title, text]) => (
              <Permission key={title} title={title} text={text} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function PrivacyPage({ copy }) {
  return (
    <main className="privacy-main privacy-page">
      <h1>{copy.policyTitle}</h1>
      <p className="lead">{copy.policyLead}</p>

      <div className="summary">
        <div className="item">
          <strong>{copy.explicitTitle}</strong>
          <p>{copy.explicitText}</p>
        </div>
        <div className="item">
          <strong>{copy.noBackendPhaseTitle}</strong>
          <p>{copy.noBackendPhaseText}</p>
        </div>
      </div>

      <PolicySection title={copy.recordsTitle}>
        <p>{copy.recordsIntro}</p>
        <ul>{copy.records.map((item) => <li key={item}>{item}</li>)}</ul>
      </PolicySection>
      <PolicySection title={copy.avoidsTitle}>
        <p>{copy.avoidsIntro}</p>
        <ul>{copy.avoids.map((item) => <li key={item}>{item}</li>)}</ul>
      </PolicySection>
      <PolicySection title={copy.replayTitle}>{copy.replayPolicy.map((item) => <p key={item}>{renderInlineCode(item)}</p>)}</PolicySection>
      <PolicySection title={copy.aiTitle}>{copy.aiPolicy.map((item) => <p key={item}>{item}</p>)}</PolicySection>
      <PolicySection title={copy.storageSharingTitle}>
        {copy.storageSharing.map((item) => (
          <p key={item}>{renderInlineCode(item)}</p>
        ))}
      </PolicySection>

      <h2>{copy.securityTitle}</h2>
      <ul className="disclosure">
        {copy.disclosures.map(([title, text]) => (
          <Disclosure key={title} title={title} text={text} />
        ))}
      </ul>

      <PolicySection title={copy.urlRedactionTitle}>
        <p>{copy.urlRedactionText}</p>
      </PolicySection>
      <PolicySection title={copy.permissionsTitle}>
        <p>{copy.permissionsIntro}</p>
        <ul className="disclosure">
          {copy.permissions.map(([title, text]) => (
            <Disclosure key={title} title={title} text={text} />
          ))}
        </ul>
      </PolicySection>
      <PolicySection title={copy.contactTitle}>
        <p>{copy.contactText}</p>
      </PolicySection>
    </main>
  );
}

function PolicySection({ title, children }) {
  return (
    <>
      <h2>{title}</h2>
      {children}
    </>
  );
}

function Permission({ title, text }) {
  return (
    <div className="permission">
      <strong>{renderInlineCode(title)}</strong>
      <span>{text}</span>
    </div>
  );
}

function Disclosure({ title, text }) {
  return (
    <li>
      <strong>{renderInlineCode(title)}</strong>
      {text}
    </li>
  );
}

function renderInlineCode(text) {
  const codeValues = ["chrome.storage.local", "activeTab", "tabs", "storage", "unlimitedStorage", "scripting", "webRequest"];
  const pattern = new RegExp(`(${codeValues.map(escapeRegExp).join("|")})`, "g");
  return String(text)
    .split(pattern)
    .map((part, index) => (codeValues.includes(part) ? <code key={`${part}-${index}`}>{part}</code> : part));
}

function formatCopy(template, params = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_match, key) =>
    params[key] === undefined || params[key] === null ? "" : String(params[key])
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isReportRoute(pathname) {
  const path = String(pathname || "");
  return (
    path === "/report" ||
    path === "/reports" ||
    path.startsWith("/report/") ||
    path.startsWith("/reports/") ||
    path.startsWith("/api/reports/")
  );
}

function getShareIdFromCurrentUrl() {
  const pathShareId = getShareIdFromPath(window.location.pathname);
  if (pathShareId) return pathShareId;

  const params = new URLSearchParams(window.location.search);
  const queryShareId = params.get("shareId") || params.get("id");
  if (queryShareId) return queryShareId.trim();

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return "";

  const hashParams = new URLSearchParams(hash.includes("=") ? hash : `shareId=${hash}`);
  return (hashParams.get("shareId") || hashParams.get("id") || "").trim();
}

function getShareIdFromPath(pathname) {
  const segments = String(pathname || "")
    .split("/")
    .filter(Boolean)
    .map(safeDecodeURIComponent);
  const reportsIndex = segments.lastIndexOf("reports");
  if (reportsIndex >= 0 && segments[reportsIndex + 1]) return segments[reportsIndex + 1].trim();
  if (segments[0] === "report" && segments[1]) return segments[1].trim();
  return "";
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildReportApiUrl(shareId) {
  return `${REPORT_API_BASE_URL}/api/reports/${encodeURIComponent(shareId)}`;
}

function buildJsonPreview(payload, copy = COPY.en) {
  const stats = {
    omittedFields: 0,
    truncatedArrays: 0,
    truncatedObjects: 0,
    truncatedStrings: 0,
    omittedEvents: 0
  };
  const value = buildReportPayloadPreview(payload, stats, copy) || previewJsonValue(payload, "", stats, new WeakSet(), copy);
  const text = JSON.stringify(value, null, 2);

  if (text.length > JSON_PREVIEW_MAX_OUTPUT_LENGTH) {
    return {
      text: `${text.slice(0, JSON_PREVIEW_MAX_OUTPUT_LENGTH)}\n... ${formatCopy(copy.reportPreviewTruncatedAt, { size: formatBytes(JSON_PREVIEW_MAX_OUTPUT_LENGTH) })}`,
      stats: {
        ...stats,
        truncatedStrings: stats.truncatedStrings + 1
      }
    };
  }

  return {
    text,
    stats
  };
}

function extractReportScreenshots(payload, copy = COPY.en) {
  const report = payload?.report && typeof payload.report === "object" ? payload.report : payload;
  if (!report || typeof report !== "object") return [];

  const screenshots = [];
  const seen = new Set();

  collectScreenshotCandidates(report.screenshots, screenshots, seen);
  collectScreenshotCandidates(report.tabs, screenshots, seen);

  if (isDataImage(report.screenshotBase64)) {
    addScreenshot(screenshots, seen, {
      id: "primary-screenshot",
      tabId: report.rootTabId,
      title: copy.reportPrimaryScreenshotTitle,
      reason: copy.reportScreenshotPrimaryReason,
      dataUrl: report.screenshotBase64
    });
  }

  return screenshots;
}

function collectScreenshotCandidates(value, screenshots, seen) {
  if (!Array.isArray(value)) return;

  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;

    if (isDataImage(item.dataUrl)) {
      addScreenshot(screenshots, seen, {
        id: item.screenshotId || `screenshot-${screenshots.length + 1}`,
        tabId: item.tabId,
        title: item.title || "",
        reason: item.reason || "",
        dataUrl: item.dataUrl
      });
    }

    if (item.screenshot && typeof item.screenshot === "object" && isDataImage(item.screenshot.dataUrl)) {
      addScreenshot(screenshots, seen, {
        id: item.screenshot.screenshotId || `tab-screenshot-${item.tabId || index}`,
        tabId: item.tabId,
        title: item.title || item.screenshot.title || "",
        reason: item.screenshot.reason || "",
        dataUrl: item.screenshot.dataUrl
      });
    }
  });
}

function addScreenshot(screenshots, seen, screenshot) {
  if (!isDataImage(screenshot.dataUrl) || seen.has(screenshot.dataUrl)) return;
  seen.add(screenshot.dataUrl);
  screenshots.push(screenshot);
}

function isDataImage(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function downloadJsonReportPayload(payload, shareId = "") {
  const report = getDownloadReportFromPayload(payload);
  const downloadableValue = isReportLikePayload(report) ? buildJsonDownloadReport(report) : payload;
  const json = JSON.stringify(downloadableValue, null, 2);
  const stoppedAt = isReportLikePayload(report) ? report.stoppedAt : payload?.createdAt;
  const filename = buildJsonDownloadFilename(stoppedAt, shareId);
  downloadTextFile(json, filename, "application/json;charset=utf-8");
}

function getDownloadReportFromPayload(payload) {
  if (payload?.report && typeof payload.report === "object") return payload.report;
  return payload;
}

function buildJsonDownloadFilename(timestamp, shareId = "") {
  const safeShareId = sanitizeFilenameSegment(shareId);
  if (safeShareId) return `bug-report-${safeShareId}.json`;
  return `bug-report-${formatFileDate(new Date(timestamp || Date.now()))}.json`;
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

function buildJsonDownloadReport(report) {
  const tabs = getDownloadReportTabs(report);
  const normalizedEvents = dedupeDownloadReportEvents(getDownloadReportEvents(report), tabs);
  const eventCountsByTab = countDownloadEventsByTab(normalizedEvents);
  const screenshots = dedupeDownloadReportScreenshots(getDownloadReportScreenshots(report));
  const screenshotByTab = new Map(screenshots.map((screenshot) => [String(screenshot.tabId), screenshot.screenshotId]));
  const rootScreenshot = screenshots.find((screenshot) => screenshot.tabId === report.rootTabId) || screenshots[0] || null;
  const summary = buildDownloadSummary(report, tabs, normalizedEvents, screenshots);

  return removeEmptyDownloadFields({
    version: report.version,
    mode: report.mode,
    rootTabId: report.rootTabId,
    startedAt: report.startedAt,
    stoppedAt: report.stoppedAt,
    durationSeconds: report.durationSeconds,
    summary,
    events: normalizedEvents,
    tabs: tabs.map((tab) => buildDownloadTab(
      tab,
      eventCountsByTab.get(String(tab.tabId)) || 0,
      screenshotByTab.get(String(tab.tabId)) || null
    )),
    replayEventCount: report.replayEventCount,
    replayTabs: report.replayTabs || [],
    replayStatus: report.replayStatus || null,
    screenshots,
    primaryScreenshotId: rootScreenshot?.screenshotId || null,
    screenshotError: screenshots.length ? null : report.screenshotError || null,
    aiExplanation: report.aiExplanation || null
  });
}

function buildDownloadTab(tab, eventCount, screenshotId) {
  return removeEmptyDownloadFields({
    tabId: tab.tabId,
    title: tab.title || "",
    url: tab.url || "",
    windowId: tab.windowId,
    startedAt: tab.startedAt,
    activeRanges: tab.activeRanges,
    eventCount,
    replay: tab.replay ? {
      eventCount: getDownloadTabReplayEventCount(tab),
      truncated: Boolean(tab.replay.truncated),
      truncatedReason: tab.replay.truncatedReason || null
    } : null,
    screenshotId,
    screenshotError: tab.screenshotError || null
  });
}

function buildDownloadSummary(report, tabs, events, screenshots) {
  return {
    ...(report.summary || {}),
    tabCount: tabs.length,
    totalEvents: events.length,
    totalReplayEvents: getTotalDownloadReplayEvents(report),
    screenshotCount: screenshots.length
  };
}

function getDownloadReportTabs(report) {
  if (Array.isArray(report?.tabs)) return report.tabs;
  return [{
    tabId: report?.tabId || report?.rootTabId || 0,
    url: report?.tabUrl || "",
    title: report?.tabTitle || "",
    events: Array.isArray(report?.events) ? report.events : []
  }];
}

function getDownloadReportEvents(report) {
  const tabEvents = getDownloadReportTabs(report).flatMap((tab) => Array.isArray(tab.events) ? tab.events : []);
  if (tabEvents.length) return tabEvents;
  return Array.isArray(report?.events) ? report.events : [];
}

function getDownloadTabReplayEvents(tab) {
  if (Array.isArray(tab?.replay?.events)) return tab.replay.events;
  if (Array.isArray(tab?.replayEvents)) return tab.replayEvents;
  return [];
}

function getDownloadTabReplayEventCount(tab) {
  if (Number(tab?.replay?.eventCount)) return Number(tab.replay.eventCount);
  if (Number(tab?.replayEventCount)) return Number(tab.replayEventCount);
  return getDownloadTabReplayEvents(tab).length;
}

function getTotalDownloadReplayEvents(report) {
  if (Number(report?.summary?.totalReplayEvents)) return Number(report.summary.totalReplayEvents);
  if (Number(report?.replayEventCount)) return Number(report.replayEventCount);
  return getDownloadReportTabs(report).reduce((total, tab) => total + getDownloadTabReplayEventCount(tab), 0);
}

function getDownloadReportScreenshots(report) {
  if (Array.isArray(report?.screenshots) && report.screenshots.length) {
    return report.screenshots.filter((screenshot) => screenshot?.dataUrl);
  }

  const tabScreenshots = getDownloadReportTabs(report)
    .filter((tab) => tab?.screenshot?.dataUrl)
    .map((tab) => ({
      tabId: tab.tabId,
      title: tab.title || tab.screenshot.title || "",
      url: tab.url || tab.screenshot.url || "",
      dataUrl: tab.screenshot.dataUrl,
      reason: tab.screenshot.reason || null,
      eventType: tab.screenshot.eventType || null,
      severity: tab.screenshot.severity || null,
      capturedAt: tab.screenshot.capturedAt || null
    }));
  if (tabScreenshots.length) return tabScreenshots;

  if (report?.screenshotBase64) {
    const tabs = getDownloadReportTabs(report);
    const rootTab = tabs.find((tab) => tab.tabId === report.rootTabId) || tabs[0] || {};
    return [{
      tabId: rootTab.tabId || report.rootTabId || 0,
      title: rootTab.title || report.tabTitle || "",
      url: rootTab.url || report.tabUrl || "",
      dataUrl: report.screenshotBase64,
      reason: "legacy",
      eventType: null,
      severity: null,
      capturedAt: null
    }];
  }

  return [];
}

function countDownloadEventsByTab(events) {
  return (Array.isArray(events) ? events : []).reduce((counts, event) => {
    const tabKey = String(event?.tabId || "");
    counts.set(tabKey, (counts.get(tabKey) || 0) + 1);
    return counts;
  }, new Map());
}

function dedupeDownloadReportEvents(events, tabs) {
  const tabsById = new Map(tabs.map((tab) => [String(tab.tabId), tab]));
  const byKey = new Map();

  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event !== "object") continue;
    const key = getDownloadEventDedupeKey(event, tabsById);
    const existing = byKey.get(key);
    if (!existing || shouldPreferDownloadEvent(event, existing)) {
      byKey.set(key, event);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
    .map((event) => {
      if (event?.type === "network" || event?.type === "networkError") {
        return {
          ...event,
          url: canonicalDownloadEventUrl(event, tabsById)
        };
      }
      return { ...event };
    });
}

function getDownloadEventDedupeKey(event, tabsById) {
  if (event?.type === "network" || event?.type === "networkError") {
    return [
      "network",
      event.tabId || "",
      String(event.method || "GET").toUpperCase(),
      canonicalDownloadEventUrl(event, tabsById),
      Number(event.statusCode || 0),
      event.triggeredByActionId || "",
      event.error || ""
    ].join("|");
  }

  if (event?.eventId) return `eventId|${event.eventId}`;

  return [
    "event",
    event?.tabId || "",
    event?.type || "",
    event?.timestamp || "",
    event?.selector || "",
    event?.message || "",
    event?.url || ""
  ].join("|");
}

function shouldPreferDownloadEvent(nextEvent, currentEvent) {
  if (nextEvent.type === "network" && currentEvent.type === "networkError") return true;
  if (nextEvent.type === "networkError" && currentEvent.type === "network") return false;
  return getDownloadEventRichnessScore(nextEvent) > getDownloadEventRichnessScore(currentEvent);
}

function getDownloadEventRichnessScore(event) {
  return [
    event.responseBody,
    event.responseHeaders && Object.keys(event.responseHeaders).length,
    event.requestBody,
    event.requestHeaders && Object.keys(event.requestHeaders).length,
    Number.isFinite(event.durationMs),
    event.source
  ].reduce((score, value) => score + (value ? 1 : 0), 0);
}

function canonicalDownloadEventUrl(event, tabsById) {
  const rawUrl = String(event?.url || "");
  const tab = tabsById.get(String(event?.tabId));

  try {
    const parsed = new URL(rawUrl, tab?.url || undefined);
    parsed.hash = "";
    return sanitizeUrl(parsed.toString());
  } catch {
    return sanitizeUrl(rawUrl);
  }
}

function dedupeDownloadReportScreenshots(screenshots) {
  const seen = new Map();
  const result = [];

  for (const screenshot of Array.isArray(screenshots) ? screenshots : []) {
    if (!screenshot?.dataUrl) continue;
    const existingId = seen.get(screenshot.dataUrl);
    if (existingId) continue;

    const screenshotId = `screenshot-${result.length + 1}`;
    seen.set(screenshot.dataUrl, screenshotId);
    result.push({
      screenshotId,
      tabId: screenshot.tabId,
      title: screenshot.title || "",
      url: screenshot.url || "",
      reason: screenshot.reason || null,
      eventType: screenshot.eventType || null,
      severity: screenshot.severity || null,
      capturedAt: screenshot.capturedAt || null,
      dataUrlOmitted: true,
      dataUrlLength: screenshot.dataUrl.length
    });
  }

  return result;
}

function sanitizeUrl(value) {
  const text = String(value || "");
  if (!text) return "";

  try {
    const url = new URL(text);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/password|token|secret|authorization|cookie|api[-_]?key|session|set-cookie/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.toString();
  } catch {
    return text.split("#")[0];
  }
}

function sanitizeFilenameSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatFileDate(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function removeEmptyDownloadFields(value) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) =>
    fieldValue !== undefined && fieldValue !== null
  ));
}

function buildReportPayloadPreview(payload, stats, copy = COPY.en) {
  const wrappedReport = payload?.report && typeof payload.report === "object" ? payload.report : null;
  const directReport = isReportLikePayload(payload) ? payload : null;
  const report = wrappedReport || directReport;
  if (!report) return null;

  if (wrappedReport) {
    return removeEmptyPreviewFields({
      ok: payload.ok,
      shareId: payload.shareId,
      rootUrl: payload.rootUrl,
      version: payload.version,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
      report: buildReportPreview(report, stats, copy),
      __previewNote: copy.reportPreviewPayloadNote
    });
  }

  return {
    ...buildReportPreview(report, stats, copy),
    __previewNote: copy.reportPreviewPayloadNote
  };
}

function isReportLikePayload(value) {
  return Boolean(value && typeof value === "object" && (
    Array.isArray(value.tabs) ||
    Array.isArray(value.events) ||
    Array.isArray(value.screenshots) ||
    value.screenshotBase64
  ));
}

function buildReportPreview(report, stats, copy = COPY.en) {
  const tabs = Array.isArray(report.tabs) ? report.tabs : [];
  const topLevelEvents = Array.isArray(report.events) ? report.events : [];
  const events = topLevelEvents.length ? topLevelEvents : tabs.flatMap((tab) => Array.isArray(tab.events) ? tab.events : []);
  const screenshots = Array.isArray(report.screenshots) ? report.screenshots : [];

  return removeEmptyPreviewFields({
    version: report.version,
    mode: report.mode,
    rootTabId: report.rootTabId,
    startedAt: report.startedAt,
    stoppedAt: report.stoppedAt,
    durationSeconds: report.durationSeconds,
    summary: report.summary,
    replayEventCount: report.replayEventCount,
    replayTabs: report.replayTabs,
    replayStatus: report.replayStatus,
    tabs: tabs.map((tab) => compactReportTab(tab, stats, copy)),
    eventsPreview: compactEvents(events, stats, copy),
    eventCount: events.length,
    screenshots: screenshots.map((screenshot) => compactScreenshot(screenshot, stats, copy)),
    screenshotCount: screenshots.length,
    screenshotError: report.screenshotError,
    aiExplanation: previewJsonValue(report.aiExplanation || null, "aiExplanation", stats, new WeakSet(), copy)
  });
}

function compactReportTab(tab, stats, copy = COPY.en) {
  const events = Array.isArray(tab.events) ? tab.events : [];
  const replayEvents = Array.isArray(tab.replay?.events) ? tab.replay.events : [];
  stats.omittedEvents += replayEvents.length;

  return removeEmptyPreviewFields({
    tabId: tab.tabId,
    title: tab.title,
    url: tab.url,
    windowId: tab.windowId,
    startedAt: tab.startedAt,
    activeRanges: tab.activeRanges,
    eventCount: events.length,
    eventsPreview: compactEvents(events, stats, copy),
    replay: tab.replay ? {
      eventCount: Number(tab.replay.eventCount || replayEvents.length || 0),
      truncated: Boolean(tab.replay.truncated),
      truncatedReason: tab.replay.truncatedReason || null,
      events: replayEvents.length ? formatCopy(copy.reportPreviewOmittedReplayEvents, { count: replayEvents.length }) : undefined
    } : undefined,
    screenshot: tab.screenshot ? compactScreenshot(tab.screenshot, stats, copy) : undefined,
    screenshotError: tab.screenshotError
  });
}

function compactEvents(events, stats, copy = COPY.en) {
  if (!Array.isArray(events) || !events.length) return [];

  if (events.length > REPORT_PREVIEW_MAX_EVENTS) {
    stats.truncatedArrays += 1;
    stats.omittedEvents += events.length - REPORT_PREVIEW_MAX_EVENTS;
  }

  const shownEvents = events.slice(0, REPORT_PREVIEW_MAX_EVENTS).map(compactEvent);
  if (events.length > REPORT_PREVIEW_MAX_EVENTS) {
    shownEvents.push({
      __previewTruncated: formatCopy(copy.reportPreviewMoreEventsOmitted, { count: events.length - REPORT_PREVIEW_MAX_EVENTS }),
      totalItems: events.length
    });
  }

  return shownEvents;
}

function compactEvent(event) {
  if (!event || typeof event !== "object") return event;

  return removeEmptyPreviewFields({
    type: event.type,
    level: event.level,
    method: event.method,
    statusCode: event.statusCode,
    timestamp: event.timestamp,
    relativeTime: event.relativeTime,
    tabId: event.tabId,
    eventId: event.eventId,
    triggeredByActionId: event.triggeredByActionId,
    selector: limitPreviewText(event.selector, 160),
    text: limitPreviewText(event.text, 160),
    message: limitPreviewText(event.message, 240),
    url: limitPreviewText(event.url, 240),
    source: limitPreviewText(event.source, 240),
    error: limitPreviewText(event.error, 160),
    stack: limitPreviewText(event.stack, 400),
    durationMs: event.durationMs
  });
}

function compactScreenshot(screenshot, stats, copy = COPY.en) {
  if (!screenshot || typeof screenshot !== "object") return screenshot;
  if (screenshot.dataUrl) stats.omittedFields += 1;

  return removeEmptyPreviewFields({
    screenshotId: screenshot.screenshotId,
    tabId: screenshot.tabId,
    title: screenshot.title,
    url: screenshot.url,
    reason: screenshot.reason,
    eventType: screenshot.eventType,
    severity: screenshot.severity,
    capturedAt: screenshot.capturedAt,
    dataUrl: screenshot.dataUrl ? formatCopy(copy.reportPreviewRenderedImage, { size: formatBytes(screenshot.dataUrl.length) }) : undefined,
    dataUrlLength: screenshot.dataUrl?.length,
    error: screenshot.error
  });
}

function previewJsonValue(value, key, stats, seen, copy = COPY.en) {
  if (typeof value === "string") {
    if (JSON_PREVIEW_HEAVY_KEYS.has(key)) {
      stats.omittedFields += 1;
      return formatCopy(copy.reportPreviewOmittedKey, { key, size: formatBytes(value.length) });
    }

    if (value.length > JSON_PREVIEW_MAX_STRING_LENGTH) {
      stats.truncatedStrings += 1;
      return `${value.slice(0, JSON_PREVIEW_MAX_STRING_LENGTH)}... ${formatCopy(copy.reportPreviewTruncatedString, { size: formatBytes(value.length) })}`;
    }

    return value;
  }

  if (!value || typeof value !== "object") return value;

  if (seen.has(value)) return copy.reportPreviewCircular;
  seen.add(value);

  if (Array.isArray(value)) {
    const shownItems = value
      .slice(0, JSON_PREVIEW_MAX_ARRAY_ITEMS)
      .map((item) => previewJsonValue(item, "", stats, seen, copy));

    if (value.length > JSON_PREVIEW_MAX_ARRAY_ITEMS) {
      stats.truncatedArrays += 1;
      shownItems.push({
        __previewTruncated: formatCopy(copy.reportPreviewMoreItemsOmitted, { count: value.length - JSON_PREVIEW_MAX_ARRAY_ITEMS }),
        totalItems: value.length
      });
    }

    seen.delete(value);
    return shownItems;
  }

  const entries = Object.entries(value);
  const shownEntries = entries.slice(0, JSON_PREVIEW_MAX_OBJECT_KEYS);
  const preview = Object.fromEntries(shownEntries.map(([entryKey, entryValue]) => [
    entryKey,
    previewJsonValue(entryValue, entryKey, stats, seen, copy)
  ]));

  if (entries.length > JSON_PREVIEW_MAX_OBJECT_KEYS) {
    stats.truncatedObjects += 1;
    preview.__previewTruncated = formatCopy(copy.reportPreviewMoreKeysOmitted, { count: entries.length - JSON_PREVIEW_MAX_OBJECT_KEYS });
    preview.__totalKeys = entries.length;
  }

  seen.delete(value);
  return preview;
}

function limitPreviewText(value, maxLength) {
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatBytes(characterCount) {
  const bytes = Number(characterCount || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function removeEmptyPreviewFields(value) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) =>
    fieldValue !== undefined && fieldValue !== null
  ));
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
