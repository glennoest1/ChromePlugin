# ⚡ CSS Component Specifications

Developers can copy these clean, professional CSS definitions directly into the extension popup files:

All components must consume semantic tokens (`--bg-app`, `--bg-panel`, `--text-primary`, `--border`, `--border-focus`) so the same markup works in light mode, dark mode, and explicit `[data-theme]` overrides.

### Public website pages

The static pages `web-office/index.html` and `web-office/privacy.html` must link to `web-office/styles.css` for page layout, typography, cards, code blocks, navigation, and theme styling. Do not reintroduce large inline `<style>` blocks in these files. If a theme switcher is present, keep the persistent state in `localStorage` under `bbb-web-theme` and let CSS react to `:root[data-theme]`. Keep `docs/` reserved for extension documentation.

### 🌟 CSS Specification for `popup/popup.css`
```css
body {
  width: 380px;
  max-height: 560px;
  margin: 0;
  overflow-y: auto;
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

.shell {
  padding: 14px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Header styling similar to Chrome Devtools */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

h1 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  color: var(--text-primary);
  margin: 0;
}

/* Radio Option Picker */
.mode-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.mode-picker label {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.01);
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
}

.mode-picker label:hover {
  background: rgba(255, 255, 255, 0.03);
}

.mode-picker label:has(input:checked) {
  border-color: var(--border-focus);
  background: rgba(59, 130, 246, 0.05);
}

/* Simple, Solid Buttons */
.button {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 4px;
  padding: 8px 12px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.button-red {
  background: var(--status-record);
  color: #ffffff;
}
.button-red:hover {
  background: #dc2626;
}

.button-dark {
  background: #1f2937;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
.button-dark:hover {
  background: #374151;
}

.button-blue {
  background: var(--action-blue);
  color: #ffffff;
}
.button-blue:hover {
  background: #1d4ed8;
}

.button-light {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.button-light:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
}

/* Professional Telemetry Counters */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.stat {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-panel);
  padding: 8px 4px;
  text-align: center;
}

.stat strong {
  display: block;
  font-size: 15px;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.stat span {
  display: block;
  color: var(--text-secondary);
  font-size: 10px;
  text-transform: uppercase;
}

/* Indicator Light Pulsing */
@keyframes soft-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-record);
  animation: soft-pulse 1.8s infinite ease-in-out;
}
```

### 🌟 CSS Specification for `options/options.css`
```css
body {
  margin: 0;
  background: var(--bg-app);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 30px;
}

.panel {
  max-width: 580px;
  margin: 0 auto;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-panel);
  padding: 20px;
}

input {
  width: 100%;
  min-height: 38px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 6px 10px;
  font-family: var(--font-mono);
  font-size: 13px;
}

input:focus {
  outline: none;
  border-color: var(--border-focus);
}
```
