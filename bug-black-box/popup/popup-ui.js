/* ====================================================================
   popup-ui.js — Tabbed report layout
   - Idle & Recording: .panel layout (full scroll)
   - Report: .report-shell layout (fixed header + scrollable tabs + footer)
   ==================================================================== */

// ── Helpers ──────────────────────────────────────────────────────────

function truncStr(str, max) {
  const s = String(str || "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : s.slice(0, max - 1) + "\u2026";
}

function mkMetric(icon, value, label) {
  return `<div class="metric-chip" title="${escapeHtml(label)}"><span class="mc-icon">${icon}</span><span class="mc-val">${escapeHtml(String(value))}</span></div>`;
}

function renderIssueSummary(jsErrors, consoleErrors, networkErrors) {
  const parts = [
    jsErrors.length ? bbbT("jsErrors", { count: jsErrors.length }) : "",
    consoleErrors.length ? bbbT("consoleErrors", { count: consoleErrors.length }) : "",
    networkErrors.length ? bbbT("failedRequests", { count: networkErrors.length }) : ""
  ].filter(Boolean);
  return parts.join(" \u00b7 ");
}

function getPopupApp() {
  return document.getElementById("app");
}

// ── Idle state ────────────────────────────────────────────────────────

function renderIdle(message = "") {
  clearTimer();
  activeReport = null;
  getPopupApp().innerHTML = `
    <section class="panel">
      <div class="header">
        <h1>Bug Black Box</h1>
        <div class="header-actions">
          ${bbbRenderLanguageSelect()}
          <button class="icon-button" id="settingsButton" title="${escapeHtml(bbbT("settings"))}" aria-label="${escapeHtml(bbbT("settings"))}">&#9881;</button>
        </div>
      </div>
      <p class="muted">Ghi thao tác, console log, lỗi JS, screenshot và failed request thành bug report có cấu trúc.</p>
      ${message ? `<div class="error">${escapeHtml(message)}</div>` : ""}
      <div class="notice">Không bấm Start khi đang ở trang <strong>chrome://</strong>. Với file local, bật quyền file URL cho extension.</div>
      <div class="mode-picker" role="radiogroup" aria-label="${escapeHtml(bbbT("recordingMode"))}">
        <label>
          <input type="radio" name="recordingMode" value="activeTab" checked>
          <span>${escapeHtml(bbbT("currentTab"))}</span>
        </label>
        <label>
          <input type="radio" name="recordingMode" value="allTabs">
          <span>${escapeHtml(bbbT("allTabs"))}</span>
        </label>
      </div>
      <button class="button button-record" id="startButton">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.5" fill="currentColor"/></svg>
        ${escapeHtml(bbbT("startRecording"))}
      </button>
      <p class="privacy-note">${escapeHtml(bbbT("privacyNote"))}</p>
      ${getExampleReportHtml()}
    </section>
  `;

  const summaryText = document.querySelector(".panel > .muted");
  const noticeText = document.querySelector(".panel > .notice");
  if (summaryText) summaryText.textContent = bbbT("appSummary");
  if (noticeText) noticeText.textContent = bbbT("startNotice");
  document.getElementById("startButton").addEventListener("click", startRecording);
  document.getElementById("settingsButton").addEventListener("click", openOptions);
  bbbWireLanguageSelect();
}

// ── Recording state ───────────────────────────────────────────────────

function renderRecording(recordingState, counts = {}) {
  clearTimer();
  const tabs = getRecordingTabs(recordingState);
  const mode = normalizeMode(recordingState.mode);

  getPopupApp().innerHTML = `
    <section class="panel">
      <div class="rec-banner">
        <span class="record-dot" aria-hidden="true"></span>
        <span class="rec-label">${escapeHtml(bbbT("recording"))}</span>
        <span id="timer" class="rec-timer">${formatDuration(recordingState.startedAt)}</span>
        <span class="rec-mode">${escapeHtml(MODE_LABELS[mode])}</span>
      </div>
      <div class="stats">
        ${stat(counts.console || 0, bbbT("logs"))}
        ${stat((counts.jsError || 0) + (counts.consoleError || 0), bbbT("errors"))}
        ${stat((counts.click || 0) + (counts.submit || 0), bbbT("actions"))}
        ${stat((counts.network || 0) + (counts.networkError || 0), bbbT("network"))}
      </div>
      <div id="recordingTabList">${mode === "allTabs" ? renderTabList(tabs) : ""}</div>
      <button class="button button-stop" id="stopButton">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="currentColor"/></svg>
        ${escapeHtml(bbbT("stopCreateReport"))}
      </button>
      <p class="muted" style="font-size:11px;color:var(--muted);text-align:center;">${escapeHtml(bbbT("keepTargetOpen"))}</p>
      ${getExampleReportHtml()}
    </section>
  `;

  document.getElementById("stopButton").addEventListener("click", stopRecording);

  statusTimer = setInterval(async () => {
    const timer = document.getElementById("timer");
    if (timer) timer.textContent = formatDuration(recordingState.startedAt);
    const status = await sendMessage({ action: "getStatus" });
    if (status?.recordingState?.isRecording) {
      updateStats(status.counts || {});
      updateRecordingTabs(status.recordingState);
    }
  }, 1000);
}

function updateStats(counts) {
  const values = document.querySelectorAll(".stat strong");
  if (values.length < 4) return;
  values[0].textContent = counts.console || 0;
  values[1].textContent = (counts.jsError || 0) + (counts.consoleError || 0);
  values[2].textContent = (counts.click || 0) + (counts.submit || 0);
  values[3].textContent = (counts.network || 0) + (counts.networkError || 0);
}

function updateRecordingTabs(recordingState) {
  const tabs = getRecordingTabs(recordingState);
  const tabCount = document.getElementById("tabCount");
  const tabList = document.getElementById("recordingTabList");
  if (tabCount) tabCount.textContent = tabs.length;
  if (tabList) tabList.innerHTML = normalizeMode(recordingState.mode) === "allTabs" ? renderTabList(tabs) : "";
}

// ── Report state (tabbed) ─────────────────────────────────────────────

function renderReport(report, hasApiKey = false, aiMessage = "") {
  clearTimer();
  activeReport = report;

  // Process data
  const tabs = getReportTabs(report);
  const events = dedupeReportEvents(getReportEvents(report), tabs);
  const counts = countEvents(events);
  const steps = events.filter(e => e.type === "click" || e.type === "submit");
  const jsErrors = events.filter(e => e.type === "jsError");
  const consoleErrors = events.filter(e => e.type === "console" && e.level === "error");
  const networkEvents = events.filter(e => e.type === "network" || e.type === "networkError");
  const networkErrors = events.filter(e => e.type === "networkError" || (e.type === "network" && (e.error || Number(e.statusCode) >= 400)));
  const hasErrors = jsErrors.length + consoleErrors.length > 0;
  const allErrors = [
    ...jsErrors.map(e => ({ ...e, _kind: "js" })),
    ...consoleErrors.map(e => ({ ...e, _kind: "console" }))
  ];
  const showExplain = hasErrors;
  const replayEventCount = getTotalReplayEvents(report);
  const replayStatusText = getReplayStatusText(report);
  const rootTab = tabs.find(t => t.tabId === report.rootTabId) || tabs[0] || {};
  const screenshots = getReportScreenshots(report);

  // Build tab definitions
  const reportTabs = [
    { id: "steps", label: bbbT("steps"), count: steps.length, cls: "" },
    ...(allErrors.length ? [{ id: "errors", label: bbbT("errors"), count: allErrors.length, cls: "badge-red" }] : []),
    ...(networkErrors.length ? [{ id: "network", label: bbbT("network"), count: networkErrors.length, cls: "badge-red" }] : []),
    ...(showExplain ? [{ id: "ai", label: bbbT("ai") }] : []),
    ...(screenshots.length ? [{ id: "media", label: "\u{1F4F7}\u00a0" + screenshots.length }] : []),
    ...(tabs.length > 1 ? [{ id: "tabs", label: bbbT("tabs") + " (" + tabs.length + ")" }] : []),
  ];

  // Page info
  const isMulti = tabs.length > 1;
  const pageTitle = isMulti ? bbbT("multiTabRecording", { count: tabs.length }) : (rootTab.title || bbbT("untitledPage"));
  const pageUrl = rootTab.url || report.tabUrl || "";
  const urlDisplay = pageUrl.replace(/^https?:\/\//, "");
  const urlText = isMulti ? bbbT("startedFrom", { url: urlDisplay }) : urlDisplay;
  const hasIssues = hasErrors || networkErrors.length > 0;
  const heroClass = hasIssues ? "rh-error" : "rh-success";
  const heroIcon = hasIssues ? "\u26a0" : "\u2713";
  const heroText = hasIssues
    ? renderIssueSummary(jsErrors, consoleErrors, networkErrors)
    : bbbT("noBlockingErrors");

  getPopupApp().innerHTML = `
    <div class="report-shell">

      <div class="report-top">
        <div class="header">
          <h1>${escapeHtml(bbbT("reportReady"))}</h1>
          <div class="header-actions">
            ${bbbRenderLanguageSelect()}
            <button class="icon-button" id="settingsButton" title="${escapeHtml(bbbT("settings"))}" aria-label="${escapeHtml(bbbT("settings"))}">&#9881;</button>
          </div>
        </div>

        <div class="report-hero-compact ${heroClass}">
          <span class="rhc-icon">${heroIcon}</span>
          <span class="rhc-text">${escapeHtml(heroText)}</span>
        </div>

        <div class="metrics-row">
          ${mkMetric("\u23f1", (report.durationSeconds || 0) + "s", bbbT("duration"))}
          ${mkMetric("\u26a1", steps.length, bbbT("actions"))}
          ${mkMetric("\ud83d\udccc", counts.console || 0, bbbT("logs"))}
          ${mkMetric("\ud83c\udf10", networkEvents.length, bbbT("network"))}
          ${mkMetric("\ud83d\uddc2", tabs.length, bbbT("tabs"))}
          ${mkMetric("\u25b6", replayEventCount, bbbT("replayEvents"))}
        </div>

        <div class="page-meta">
          <div class="pm-title" title="${escapeHtml(rootTab.title || bbbT("untitledPage"))}">${escapeHtml(pageTitle)}</div>
          <div class="pm-url"   title="${escapeHtml(pageUrl)}">${escapeHtml(urlText)}</div>
          <div class="pm-sub">${escapeHtml(MODE_LABELS[normalizeMode(report.mode)] || bbbT("currentTab"))} &middot; ${escapeHtml(replayStatusText)}</div>
        </div>

        <nav class="tabs-nav" id="tabsNav" role="tablist">
          ${reportTabs.map((t, i) => `
            <button class="tab-btn${i === 0 ? " active" : ""}" data-tab="${t.id}" role="tab" aria-selected="${i === 0}">
              ${escapeHtml(t.label)}
              ${t.count != null ? `<span class="tbadge ${t.cls || ""}">${t.count}</span>` : ""}
            </button>
          `).join("")}
        </nav>
      </div>

      <div class="tab-body" id="tabBody" role="tabpanel"></div>

      <div class="report-actions">
        ${replayEventCount ? `<button class="ra-btn ra-replay" id="replayButton">\u25b6 ${escapeHtml(bbbT("replay"))}</button>` : ""}
        <button class="ra-btn ra-dl" id="downloadButton">\u2193 .md</button>
        <button class="ra-btn ra-dl" id="downloadJsonButton">\u2193 .json</button>
        <button class="ra-btn ra-clear" id="resetButton">\u00d7 ${escapeHtml(bbbT("clear"))}</button>
      </div>
    </div>
  `;

  // Store data for tab rendering
  window.__rptData = { stepsPage: 0, steps, allErrors, jsErrors, consoleErrors, networkErrors, networkEvents, report, hasApiKey, aiMessage, screenshots, tabs, replayEventCount };

  // Render initial tab
  renderTabContent("steps");

  // Tab switching
  document.getElementById("tabsNav").addEventListener("click", e => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    renderTabContent(btn.dataset.tab);
  });

  // Wire buttons
  document.getElementById("settingsButton").addEventListener("click", openOptions);
  bbbWireLanguageSelect();
  document.getElementById("downloadButton").addEventListener("click", () => downloadReport(activeReport));
  document.getElementById("downloadJsonButton").addEventListener("click", () => downloadJsonReport(activeReport));
  document.getElementById("resetButton").addEventListener("click", resetReport);
  const replayBtn = document.getElementById("replayButton");
  if (replayBtn) replayBtn.addEventListener("click", openReplayPage);
  attachOpenOptionsLink();
}

function renderTabContent(tabId) {
  const body = document.getElementById("tabBody");
  if (!body) return;
  const d = window.__rptData;
  if (!d) return;

  body.scrollTop = 0;

  switch (tabId) {
    case "steps": body.innerHTML = buildStepsTab(d.steps, d.stepsPage || 0); attachStepsPagination(); break;
    case "errors": body.innerHTML = buildErrorsTab(d.allErrors); attachErrorToggles(); break;
    case "network": body.innerHTML = buildNetworkTab(d.networkErrors); break;
    case "ai": body.innerHTML = buildAiTab(d.report, d.hasApiKey, d.aiMessage);
      attachExplainBtn(); break;
    case "media": body.innerHTML = buildMediaTab(d.screenshots); break;
    case "tabs": body.innerHTML = buildTabsListTab(d.tabs); break;
  }
}

// ── Tab content builders ──────────────────────────────────────────────

function buildStepsTab(steps, pageIndex = 0) {
  if (!steps.length) return `<p class="empty-msg">${escapeHtml(bbbT("noUserActions"))}</p>`;

  const PAGE_SIZE = 8;
  const totalPages = Math.ceil(steps.length / PAGE_SIZE);
  const start = pageIndex * PAGE_SIZE;
  const shown = steps.slice(start, start + PAGE_SIZE);

  const rows = shown.map((step, i) => {
    const globalIndex = start + i + 1;
    const isSubmit = step.type === "submit";
    const verb = isSubmit ? bbbT("submit") : bbbT("click");
    const raw = String(step.text || "").replace(/\s+/g, " ").trim();
    // Prefer clean text label, fall back to selector
    const label = raw && raw.length > 0 ? raw : "";
    const selector = String(step.selector || "");
    const display = label || selector;
    return `
      <li class="step-row">
        <span class="step-num">${globalIndex}</span>
        <span class="step-verb ${isSubmit ? "sv-submit" : "sv-click"}">${verb}</span>
        <span class="step-text">${label
        ? escapeHtml(display)
        : `<code>${escapeHtml(display)}</code>`
      }</span>
      </li>`;
  }).join("");

  let paginationHtml = "";
  if (totalPages > 1) {
    let pages = [];
    pages.push(0); // Always first page

    let startPage = Math.max(1, pageIndex - 1);
    let endPage = Math.min(totalPages - 2, pageIndex + 1);

    if (pageIndex === 0) {
      endPage = Math.min(totalPages - 2, 2);
    } else if (pageIndex === totalPages - 1) {
      startPage = Math.max(1, totalPages - 3);
    }

    if (startPage > 1) pages.push("...");
    for (let p = startPage; p <= endPage; p++) pages.push(p);
    if (endPage < totalPages - 2) pages.push("...");

    if (totalPages > 1) pages.push(totalPages - 1); // Always last page if more than 1

    const pageButtons = pages.map(p => {
      if (p === "...") return `<span class="sp-ellipsis">&hellip;</span>`;
      const isActive = p === pageIndex;
      return `<button class="sp-num-btn ${isActive ? 'active' : ''}" data-page="${p}">${p + 1}</button>`;
    }).join("");

    paginationHtml = `
      <div class="steps-pagination">
        <button class="icon-button sp-prev" ${pageIndex === 0 ? "disabled" : ""} title="${escapeHtml(bbbT("previous"))}">&lsaquo;</button>
        ${pageButtons}
        <button class="icon-button sp-next" ${pageIndex === totalPages - 1 ? "disabled" : ""} title="${escapeHtml(bbbT("next"))}">&rsaquo;</button>
      </div>
    `;
  }

  return `
    <ul class="steps-list">${rows}</ul>
    ${paginationHtml}
  `;
}

function attachStepsPagination() {
  const d = window.__rptData;
  if (!d) return;

  const prevBtn = document.querySelector(".sp-prev");
  const nextBtn = document.querySelector(".sp-next");
  const numBtns = document.querySelectorAll(".sp-num-btn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      d.stepsPage = Math.max(0, (d.stepsPage || 0) - 1);
      renderTabContent("steps");
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const PAGE_SIZE = 8;
      const totalPages = Math.ceil(d.steps.length / PAGE_SIZE);
      d.stepsPage = Math.min(totalPages - 1, (d.stepsPage || 0) + 1);
      renderTabContent("steps");
    });
  }

  numBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const page = parseInt(e.target.dataset.page, 10);
      if (!isNaN(page)) {
        d.stepsPage = page;
        renderTabContent("steps");
      }
    });
  });
}

function buildErrorsTab(allErrors) {
  if (!allErrors.length) return `<p class="empty-msg">${escapeHtml(bbbT("noErrorsCaptured"))}</p>`;

  return allErrors.map((err, i) => {
    const isJs = err._kind === "js";
    const time = formatTime(err.timestamp);
    const rawMsg = String(err.message || "").replace(/\s+/g, " ").trim();
    const msgShort = truncStr(rawMsg, 100);
    const src = isJs && err.source
      ? err.source.replace(/^https?:\/\/[^/]+/, "") + (err.lineno ? `:${err.lineno}` : "")
      : "";
    const stackText = isJs ? (err.stack || rawMsg) : (err.message || rawMsg);
    return `
      <div class="err-card" id="ec${i}">
        <div class="ec-head" data-i="${i}">
          <span class="ec-badge ${isJs ? "ecb-js" : "ecb-con"}">${isJs ? "JS" : "CON"}</span>
          <span class="ec-time">${escapeHtml(time)}</span>
          <span class="ec-angle" id="eca${i}">&#8250;</span>
        </div>
        <div class="ec-msg">${escapeHtml(msgShort)}</div>
        <div class="ec-detail" id="ecd${i}" hidden>
          ${src ? `<div class="ec-src">${escapeHtml(src)}</div>` : ""}
          <pre class="ec-stack">${escapeHtml(String(stackText))}</pre>
        </div>
      </div>`;
  }).join("");
}

function attachErrorToggles() {
  document.querySelectorAll(".ec-head").forEach(head => {
    head.addEventListener("click", () => {
      const i = head.dataset.i;
      const detail = document.getElementById(`ecd${i}`);
      const angle = document.getElementById(`eca${i}`);
      const card = document.getElementById(`ec${i}`);
      if (!detail) return;
      const open = !detail.hidden;
      detail.hidden = open;
      if (angle) angle.innerHTML = open ? "&#8250;" : "&#8964;";
      if (card) card.classList.toggle("ec-open", !open);
    });
  });
}

function buildNetworkTab(networkErrors) {
  if (!networkErrors.length) return `<p class="empty-msg">${escapeHtml(bbbT("noNetworkErrors"))}</p>`;

  return networkErrors.map(err => {
    const method = err.method || "GET";
    const fullUrl = err.url || "";
    const pathOnly = fullUrl.replace(/^https?:\/\/[^/]+/, "") || fullUrl;
    const statusCode = err.statusCode ? String(err.statusCode) : (err.error || "failed");
    const time = formatTime(err.timestamp);
    return `
      <div class="net-row">
        <span class="net-method">${escapeHtml(method)}</span>
        <span class="net-url" title="${escapeHtml(fullUrl)}">${escapeHtml(truncStr(pathOnly || fullUrl, 38))}</span>
        <span class="net-status">${escapeHtml(statusCode)}</span>
        <span class="net-time">${escapeHtml(time)}</span>
      </div>`;
  }).join("");
}

function buildAiTab(report, hasApiKey, aiMessage) {
  if (report.aiExplanation) {
    return `
      <div class="ai-card ai-card-done">
        <h3>${escapeHtml(bbbT("aiExplanation"))}</h3>
        <p>${escapeHtml(report.aiExplanation)}</p>
      </div>`;
  }
  return `
    <div class="ai-card">
      <div class="ai-header">
        <span class="ai-icon">&#10022;</span>
        <div>
          <div class="ai-title">${escapeHtml(bbbT("explainWithGemini"))}</div>
          <div class="ai-sub">Phân tích lỗi và đề xuất hướng sửa bằng AI</div>
        </div>
      </div>
      ${aiMessage ? `<div class="ai-error">${escapeHtml(aiMessage)}</div>` : ""}
      <button class="button button-ai" id="explainButton">${escapeHtml(bbbT("explainWithAI"))}</button>
      ${!hasApiKey ? `<p class="ai-note">${escapeHtml(bbbT("noApiKeyOpenSettings"))} <button class="link-btn" id="openOptionsLink">${escapeHtml(bbbT("openSettings"))}</button></p>` : ""}
    </div>`;
}

function attachExplainBtn() {
  const btn = document.getElementById("explainButton");
  if (btn) btn.addEventListener("click", explainWithAI);
  attachOpenOptionsLink();
}

function buildMediaTab(screenshots) {
  if (!screenshots.length) return `<p class="empty-msg">${escapeHtml(bbbT("noScreenshots"))}</p>`;
  return screenshots.map((s, i) => `
    <div class="media-card">
      <img class="media-img" src="${s.dataUrl}" alt="Screenshot ${i + 1}" loading="lazy">
      <div class="media-info">
        <div class="mi-title">${escapeHtml(s.title || bbbT("tabs") + " " + (s.tabId || i + 1))}</div>
        <div class="mi-meta">${escapeHtml(formatScreenshotMeta(s))}</div>
      </div>
    </div>`).join("");
}

function buildTabsListTab(tabs) {
  if (!tabs.length) return `<p class="empty-msg">${escapeHtml(bbbT("noTabsCaptured"))}</p>`;
  return tabs.map(tab => {
    const events = Array.isArray(tab.events) ? tab.events.length : "?";
    const replay = getTabReplayEventCount(tab);
    const url = (tab.url || "").replace(/^https?:\/\//, "");
    return `
      <div class="tlist-row">
        <div class="tlr-title">${escapeHtml(tab.title || bbbT("untitledPage"))}</div>
        <div class="tlr-url">${escapeHtml(truncStr(url, 44))}</div>
        <div class="tlr-counts">${escapeHtml(bbbT("eventsReplay", { events, replay }))}</div>
      </div>`;
  }).join("");
}

// ── Shared helpers ─────────────────────────────────────────────────────

function renderTabList(tabs) {
  if (!tabs.length) return `<p class="muted" style="font-size:11px">${escapeHtml(bbbT("noTabsYet"))}</p>`;
  return `
    <ul class="tab-list">
      ${tabs.map(tab => `
        <li>
          <strong>${escapeHtml(tab.title || bbbT("untitledPage"))}</strong>
          <span>${escapeHtml(tab.url || bbbT("unknownUrl"))}</span>
          ${Array.isArray(tab.events) ? `<em>${escapeHtml(bbbT("eventsReplay", { events: tab.events.length, replay: getTabReplayEventCount(tab) }))}</em>` : ""}
        </li>`).join("")}
    </ul>`;
}

function stat(value, label) {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

// Stubs kept for backward compatibility (not used in new layout):
function renderReportHero() { return ""; }
function renderReportMetricGrid() { return ""; }
function renderScreenshotPreview() { return ""; }
function reportMetric() { return ""; }
function renderAiBlock() { return ""; }

function getExampleReportHtml() {
  return `
    <div class="example-box">
      <div class="eb-title">Report Example</div>
      <div class="eb-mock">
        <div class="eb-hero"><span>✓</span> No blocking errors found</div>
        <div class="eb-metrics">
          <div class="eb-metric">⏱ 14s</div>
          <div class="eb-metric">⚡ 20</div>
          <div class="eb-metric">📌 2</div>
          <div class="eb-metric">▶ 121</div>
        </div>
        <div class="eb-meta">
          <div class="eb-m-title">Multi-tab Recording (4 tabs)</div>
          <div class="eb-m-url">Started from: 127.0.0.1:8080/test-page.html</div>
        </div>
        <div class="eb-tabs">
          <span class="eb-tab active">Steps <span class="eb-badge">20</span></span>
          <span class="eb-tab">Errors <span class="eb-badge" style="background:var(--red-soft);color:var(--red-dark);">0</span></span>
          <span class="eb-tab">Network</span>
          <span class="eb-tab">AI ✦</span>
          <span class="eb-tab">📷 2</span>
          <span class="eb-tab">Tabs (4)</span>
        </div>
        <div class="eb-step">
          <span class="eb-num">1</span>
          <span class="eb-verb">CLICK</span>
          <span class="eb-text">Checkout Button</span>
        </div>
        <div class="eb-actions">
          <span class="eba-btn eba-replay">▶ Replay</span>
          <span class="eba-btn eba-dl">↓ .md</span>
          <span class="eba-btn eba-dl">↓ .json</span>
          <span class="eba-btn eba-clear">× Clear</span>
        </div>
      </div>
    </div>
  `;
}

function buildAiTab(report, hasApiKey, aiMessage) {
  const explanationLanguage = bbbNormalizeLanguage(report.aiExplanationLanguage || "vi");
  const currentLanguage = bbbNormalizeLanguage(bbbCurrentLanguage);

  if (report.aiExplanation && explanationLanguage === currentLanguage) {
    return `
      <div class="ai-card ai-card-done">
        <h3>${escapeHtml(bbbT("aiExplanation"))}</h3>
        <p>${escapeHtml(report.aiExplanation)}</p>
      </div>`;
  }

  return `
    <div class="ai-card">
      <div class="ai-header">
        <span class="ai-icon">&#10022;</span>
        <div>
          <div class="ai-title">${escapeHtml(bbbT("explainWithGemini"))}</div>
          <div class="ai-sub">${escapeHtml(bbbT("aiSub"))}</div>
        </div>
      </div>
      ${aiMessage ? `<div class="ai-error">${escapeHtml(aiMessage)}</div>` : ""}
      <button class="button button-ai" id="explainButton">${escapeHtml(bbbT("explainWithAI"))}</button>
      ${!hasApiKey ? `<p class="ai-note">${escapeHtml(bbbT("noApiKeyOpenSettings"))} <button class="link-btn" id="openOptionsLink">${escapeHtml(bbbT("openSettings"))}</button></p>` : ""}
    </div>`;
}

function getExampleReportHtml() {
  return `
    <div class="example-box">
      <div class="eb-title">${escapeHtml(bbbT("reportExample"))}</div>
      <div class="eb-mock">
        <div class="eb-hero"><span>&#10003;</span> ${escapeHtml(bbbT("noBlockingErrors"))}</div>
        <div class="eb-metrics">
          <div class="eb-metric">&#9201; 14s</div>
          <div class="eb-metric">&#9889; 20</div>
          <div class="eb-metric">&#128204; 2</div>
          <div class="eb-metric">&#9654; 121</div>
        </div>
        <div class="eb-meta">
          <div class="eb-m-title">${escapeHtml(bbbT("multiTabRecording", { count: 4 }))}</div>
          <div class="eb-m-url">${escapeHtml(bbbT("startedFrom", { url: "127.0.0.1:8080/test-page.html" }))}</div>
        </div>
        <div class="eb-tabs">
          <span class="eb-tab active">${escapeHtml(bbbT("steps"))} <span class="eb-badge">20</span></span>
          <span class="eb-tab">${escapeHtml(bbbT("errors"))} <span class="eb-badge" style="background:var(--red-soft);color:var(--red-dark);">0</span></span>
          <span class="eb-tab">${escapeHtml(bbbT("network"))}</span>
          <span class="eb-tab">${escapeHtml(bbbT("ai"))}</span>
          <span class="eb-tab">&#128247; 2</span>
          <span class="eb-tab">${escapeHtml(bbbT("tabs"))} (4)</span>
        </div>
        <div class="eb-step">
          <span class="eb-num">1</span>
          <span class="eb-verb">${escapeHtml(bbbT("click").toUpperCase())}</span>
          <span class="eb-text">Checkout Button</span>
        </div>
        <div class="eb-actions">
          <span class="eba-btn eba-replay">&#9654; ${escapeHtml(bbbT("replay"))}</span>
          <span class="eba-btn eba-dl">&#8595; .md</span>
          <span class="eba-btn eba-dl">&#8595; .json</span>
          <span class="eba-btn eba-clear">&times; ${escapeHtml(bbbT("clear"))}</span>
        </div>
      </div>
    </div>
  `;
}
