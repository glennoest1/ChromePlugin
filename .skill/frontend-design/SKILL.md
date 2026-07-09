---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults. Merged with Bug Black Box professional developer specifications.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Approach this as the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. This client has already rejected proposals that felt templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to this brief, and take one real aesthetic risk you can justify.

## Ground it in the subject

If the brief does not pin down what the product or subject is, pin it yourself before designing: name one concrete subject, its audience, and the page's single job, and state your choice. If there's any information in your memory about the human's preferences, context about what they're building, or designs you've made before – use that as a hint. The subject's own world, its materials, instruments, artifacts, and vernacular, is where distinctive choices come from. Build with the brief's real content and subject matter throughout.

## Design principles

For web designs, the hero is a thesis. Open with the most characteristic thing in the subject's world, in whatever form makes sense for it: a headline, an image, an animation, a live demo, an interactive moment. Be deliberate with your choice: a big number with a small label, supporting stats, and a gradient accent is the template answer, only use if that's truly the best option.

Typography carries the personality of the page. Pair the display and body faces deliberately, not the same families you would reach for on any other project, and set a clear type scale with intentional weights, widths, and spacing. Make the type treatment itself a memorable part of the design, not a neutral delivery vehicle for the content.

Structure is information. Structural devices, numbering, eyebrows, dividers, labels, should encode something true about the content, not decorate it. Many generic designs use numbered markers (01 / 02 / 03), but that's only appropriate if the content actually is a sequence - like a real process or a typed timeline where order carries information the reader needs. Question if choices like numbered markers actually make sense before incorporating them.

Leverage motion deliberately. Think about where and if animation can serve the subject: a page-load sequence, a scroll-triggered reveal, hover micro-interactions, ambient atmosphere. An orchestrated moment usually lands harder than scattered effects; choose what the direction calls for. However, sometimes less is more, and extra animation contributes to the feeling that the design is AI-generated.

Match complexity to the vision. Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail. Elegance is executing the chosen vision well.

Consider written content carefully. Often a design brief may not contain real content, and it's up to you to come up with copy. Copy can make a design feel as templated as the design itself. See the below section on writing for more guidance.

## Process: brainstorm, explore, plan, critique, build, critique again

For calibration: AI-generated design right now clusters around three looks: (1) a warm cream background (near #F4F1EA) with a high-contrast serif display and a terracotta accent; (2) a near-black background with a single bright acid-green or vermilion accent; (3) a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns. All three are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject. Where the brief pins down a visual direction, follow it exactly — the brief's own words always win, including when it asks for one of these looks. Where it leaves an axis free, don't spend that freedom on one of these defaults. Just like a human designer who's hired, there's often a careful balance between doing what you're good at and taking each project as a chance to experiment and learn.

Work in two passes. First, brainstorm a short design plan based on the human's design brief: create a compact token system with color, type, layout, and signature. Color: describe the palette as 4–6 named hex values. Type: the typefaces for 2+ roles (a characterful display face that's used with restraint, a complementary body face, and a utility face for captions or data if needed). Layout: a layout concept, using one-sentence prose descriptions and ASCII wireframes to ideate and compare. Signature: the single unique element this page will be remembered by that embodies the brief in an appropriate way.

Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar) rather than a choice made for this specific brief — revise that part, say what you changed and why. Only after you've confirmed the relative uniqueness of your design plan should you start to write the code, following the revised plan exactly and deriving every color and type decision from it.

When writing the code, be careful of structuring your CSS selector specificities. It's easy to generate CSS classes that cancel each other out (especially with a type-based selector like .section and a element-based selector like .cta). This can happen often with paddings/margins between sections.

Try to do a lot of this planning and iteration in your thinking, and only show ideas to the user when you have higher confidence it'll delight them.

## Restraint and self-critique

Spend your boldness in one place. Let the signature element be the one memorable thing, keep everything around it quiet and disciplined, and cut any decoration that does not serve the brief. Not taking a risk can be a risk itself! Build to a quality floor without announcing it: responsive down to mobile, visible keyboard focus, reduced motion respected. Critique your own work as you build, taking screenshots if your environment supports it – a picture is worth 1000 tokens. Consider Chanel's advice: before leaving the house, take a look in the mirror and remove one accessory. Human creators have memory and always try to do something new, so if you have a space to quickly jot down notes about what you've tried, it can help you in future passes.

## More on writing in design

Words appear in a design for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration. Bring the same intentionality to copy that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience.

Write from the end user's side of the screen. Name things by what people control and recognize, never by how the system is built. A person manages notifications, not webhook config. Describe what something does in plain terms rather than selling it. Being specific is always better than being clever.

Use active voice as default. A control should say exactly what happens when it's used: "Save changes," not "Submit." An action keeps the same name through the whole flow, so the button that says "Publish" produces a toast that says "Published." The vocabulary of an interface is the signposting for someone navigating the product. Cohesion and consistency are how people learn their way around.

Treat failure and emptiness as moments for direction, not mood. Explain what went wrong and how to fix it, in the interface's voice rather than a person's. Errors don't apologize, and they are never vague about what happened. An empty screen is an invitation to act.

Keep the register conversational and tuned: plain verbs, sentence case, no filler, with tone matched to the brand and the audience. Let each element do exactly one job. A label labels, an example demonstrates, and nothing quietly does double duty.

---

# 🕵️ Project Specific: Bug Black Box Professional Design System

This section details the professional, clean visual style guidelines, css variables, templates, and validation hooks specifically customized for the **Bug Black Box** project.

## 🎨 Visual Identity & Style Tokens

To build a professional, premium developer tool, we use a refined grayscale slate palette with subtle semantic indicators:
1. **Refined Dark Slate Slate backgrounds** to ensure comfortable reading during long coding sessions.
2. **Minimalist Borders**: Ultra-fine solid borders (`1px solid var(--border)`) to separate logical compartments.
3. **Restrained Color Accents**: Flat indicators (sober red for recording, soft green for success, blue for actions) rather than heavy glows or gradients.

### 🎨 Color Palette (Sober & Professional)
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

## 📐 Layout & Visual Hierarchy

The UI must feel like a natural extension of Chrome DevTools:

### 1. Idle Interface (Start Point)
- **Compact Brand**: Header with a flat title and simple settings icon. No large icons.
- **Segmented Scope Selector**: Border-based segment selectors with a subtle background shift when active.
- **CTA Button**: A simple, solid button containing a red circular recording icon inside it.

### 2. Telemetry State (During Recording)
- **Status Banner**: A thin red-bordered bar indicating the active state and running timer.
- **Metric Grid**: Four equal columns showing numbers and labels with monospace typography. No gradients, just structured data.
- **Subtle Pulse**: The recording indicator should have a gentle opacity pulse to indicate liveness without drawing excessive visual attention.

### 3. Report Ready (Inspection State)
- **Audit Cards**: Framed blocks displaying metadata such as Duration, URLs, and Tab counts.
- **Reproduce Steps**: A clean, numbered ordered list where numbers are styled as muted gray monospace tags (`01`, `02`, `03`).
- **AI Explanation Box**: A clean container with a light blue left-border accent, avoiding flashy styling.

## ⚡ CSS Component Specifications

Developers can copy these clean, professional CSS definitions directly into the extension popup files:

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

## 📦 Chrome Web Store Compliance & Copywriting Guidelines

To pass the Chrome Web Store review quickly and build user trust, the frontend UI text must adhere to strict guidelines. Below is the approved copy and disclosure structure that must be placed in the UI:

### 1. Clear Permissions Disclosure (To be shown in Options/Settings or Extension onboarding)
Every permission requested in `manifest.json` must be explained in user-friendly terms within the settings panel:
- **`activeTab` & `tabs`**: *"Used exclusively to attach the recorder and sync recording timelines across the tab(s) you select. We do not track background tab activities."*
- **`storage`**: *"Used to save your local extension state and securely store your optional Gemini API key locally on your device."*
- **`scripting`**: *"Used to inject the logging interface to read console warnings, errors, and click sequences."*

### 2. Single-Purpose Compliance Description (For Store Listing & UI Subtitles)
The Web Store requires a clear single-purpose description.
- **Short Subtitle (in Popup UI)**: *"Record console logs, JavaScript exceptions, network requests, and user action trails into structured bug reports."*
- **Long Description**: *"Bug Black Box is a developer-focused flight recorder for web applications. It monitors front-end execution parameters in real-time, helping QA engineers and software developers capture, trace, and explain bugs instantly without manually compiling reproduction steps."*

### 3. Strict User Data Privacy Policy Statement (Must be accessible in UI Options)
Include a "Privacy & Security" section at the bottom of the Options/Settings UI page with the following copy:
- **Sensitive Fields Redaction**: *"Sensitive values (e.g. passwords, bearer authorization tokens, cookies) are automatically redacted locally before any data is exported or analyzed."*
- **No Remote Tracking**: *"Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs."*
- **Gemini API Transparency**: *"When using 'Explain with AI', only the specific Javascript exceptions and related stack traces are sent to the Gemini API endpoint to produce an explanation. Your credentials and full logs are never transmitted."*

---

## ♿ Accessibility (A11y) & Usability standards
Professional developer tools require strict compliance with design accessibility rules to guarantee an excellent user experience for everyone:
1. **Interactive Elements Focus**: Every clickable element (`button`, `input`, `a`, `label[for]`) must have an active `:focus-visible` state. Default browsers outline should be replaced with a clear border: `outline: 2px solid var(--border-focus); outline-offset: 1px;`.
2. **Color Contrast Ratio**: Text to background contrast ratio must be WCAG AA compliant. All body text (`var(--text-primary)`) uses `#e2e8f0` on `#161d28` panel background, providing a contrast ratio of > 7.5:1.
3. **Screen Readers**: Elements representing dynamic counters (e.g. logs count) must use appropriate aria labels: `<div class="stat" aria-label="12 active logs captured">`.

---

## 🔗 Workflow Hooks (Validation System)

To maintain design quality and prevent flashy or unprofessional layouts, the design system includes two automated hook scripts in the [hook/](file:///D:/dev/work/ChromePlugin/.skill/frontend-design/hook/) folder:

1. **[check-prompt.js](file:///D:/dev/work/ChromePlugin/.skill/frontend-design/hook/check-prompt.js)** (Pre-Work Hook):
   - Scans user prompts/requirements before implementation.
   - Automatically determines if the task is related to UI or frontend. If not, it skips checking immediately.
   - Detects flashy, neon, or over-decorated design requests and issues warnings to stick to clean developer console aesthetics.
2. **[check-frontend.js](file:///D:/dev/work/ChromePlugin/.skill/frontend-design/hook/check-frontend.js)** (Post-Work Hook):
   - Audits the resulting HTML/CSS files (e.g., `popup.css`).
   - Verifies compliance with layout rules, proper color variable usage, and constraints (like correct popup widths).
