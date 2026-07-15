import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { COPY, LANGUAGE_KEY, normalizeLanguage } from "./copy";
import iconUrl from "../icon128.png";
import "../styles.css";

const THEME_KEY = "bbb-web-theme";
const REPORT_API_BASE_URL = (import.meta.env.VITE_REPORT_API_BASE_URL || "https://chromepluginbackend.onrender.com").replace(/\/+$/, "");

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
        ? "Shared Report - Bug Black Box"
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
        <a className="brand" href="/" aria-label="Bug Black Box home" onClick={goHome}>
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
            <nav aria-label="Primary navigation">
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

      <section className="json-shell" aria-live="polite">
        <div className="json-head">
          <span>{loadedShareId ? `shareId: ${loadedShareId}` : copy.reportNoLoaded}</span>
          <span>{isLoading ? copy.reportFetching : reportPayload ? copy.reportJsonStatus : copy.reportReady}</span>
        </div>
        {error ? (
          <p className="json-message json-error">{error}</p>
        ) : reportPayload ? (
          <pre className="json-viewer">{JSON.stringify(reportPayload, null, 2)}</pre>
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

        <div className="terminal" aria-label="Example bug report preview">
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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
