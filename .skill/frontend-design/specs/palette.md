# 🎨 Color Palette & Style Tokens

To build a professional, premium developer tool, we use a refined grayscale slate palette with subtle semantic indicators in both light and dark modes:
1. **Dual-mode slate backgrounds** to ensure comfortable reading during long coding sessions and clear presentation on public documentation pages.
2. **Minimalist Borders**: Ultra-fine solid borders (`1px solid var(--border)`) to separate logical compartments.
3. **Restrained Color Accents**: Flat indicators (sober red for recording, soft green for success, blue for actions) rather than heavy glows or gradients.
4. **Stable token names**: Components must use the same semantic variables in both modes. Theme switching should change token values, not component selectors.
5. **Public docs parity**: `docs/styles.css` is the shared stylesheet for `docs/index.html` and `docs/privacy.html`; both pages must support system light/dark mode and explicit `data-theme` overrides with these same token names.

### CSS Variables Definition
```css
:root {
  color-scheme: light dark;
  --bg-app: #f8fafc;          /* Light app canvas */
  --bg-panel: #ffffff;        /* Light panel background */
  --border: #d8dee8;          /* Subtle light divider */
  --border-focus: #3b82f6;    /* Standard VS-Code blue focus border */
  
  /* Typography */
  --text-primary: #172026;    /* High contrast slate text */
  --text-secondary: #5d6872;  /* Soft gray for metadata */
  --text-muted: #7b8794;      /* Captions/descriptions */
  
  /* Status Signals (Flat, Non-neon) */
  --status-record: #ef4444;   /* Sober recording red */
  --status-success: #10b981;  /* Standard green for clean states */
  --status-warning: #f59e0b;  /* Orange for console.warn or failed requests */
  --status-error: #f43f5e;    /* Refined pink-red for JS Errors */
  --action-blue: #2563eb;     /* Actionable blue button */
  
  /* Monospace Output */
  --code-bg: #eef2f7;
  --font-mono: "SF Mono", Consolas, "JetBrains Mono", Menlo, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-app: #0f141c;          /* Settled dark charcoal canvas */
    --bg-panel: #161d28;        /* Clean dark panel background */
    --border: #252e3d;          /* Subtle developer console divider */
    --text-primary: #e2e8f0;    /* Crisp off-white */
    --text-secondary: #94a3b8;  /* Soft gray for metadata */
    --text-muted: #64748b;      /* Deep gray for captions/descriptions */
    --code-bg: #0b0f16;
  }
}

:root[data-theme="dark"] {
  --bg-app: #0f141c;
  --bg-panel: #161d28;
  --border: #252e3d;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --code-bg: #0b0f16;
}
```
