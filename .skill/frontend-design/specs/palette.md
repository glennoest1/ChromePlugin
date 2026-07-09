# 🎨 Color Palette & Style Tokens

To build a professional, premium developer tool, we use a refined grayscale slate palette with subtle semantic indicators:
1. **Refined Dark Slate Slate backgrounds** to ensure comfortable reading during long coding sessions.
2. **Minimalist Borders**: Ultra-fine solid borders (`1px solid var(--border)`) to separate logical compartments.
3. **Restrained Color Accents**: Flat indicators (sober red for recording, soft green for success, blue for actions) rather than heavy glows or gradients.

### CSS Variables Definition
```css
:root {
  color-scheme: dark;
  --bg-app: #0f141c;          /* Settle dark charcoal canvas */
  --bg-panel: #161d28;        /* Clean card/panel background */
  --border: #252e3d;          /* Subtle developer console divider */
  --border-focus: #3b82f6;    /* Standard VS-Code blue focus border */
  
  /* Typography */
  --text-primary: #e2e8f0;    /* Crisp off-white */
  --text-secondary: #94a3b8;  /* Soft gray for metadata */
  --text-muted: #64748b;     /* Deep gray for captions/descriptions */
  
  /* Status Signals (Flat, Non-neon) */
  --status-record: #ef4444;   /* Sober recording red */
  --status-success: #10b981;  /* Standard green for clean states */
  --status-warning: #f59e0b;  /* Orange for console.warn or failed requests */
  --status-error: #f43f5e;    /* Refined pink-red for JS Errors */
  --action-blue: #2563eb;     /* Actionable blue button */
  
  /* Monospace Output */
  --code-bg: #0b0f16;
  --font-mono: "SF Mono", Consolas, "JetBrains Mono", Menlo, monospace;
}
```
