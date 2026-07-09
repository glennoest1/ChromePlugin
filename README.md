# 🕵️ Bug Black Box

> [!NOTE]  
> **Bug Black Box** is a premium flight recorder for web applications, packaged as a lightweight Chrome Extension. It captures user interaction flows, console logs, runtime errors, failed network requests, and active viewport screenshots to automatically generate structured bug reports.

```mermaid
graph LR
    Start([⏺ Start Recording]) --> ThaoTac[User Interacts / App Throws Logs]
    ThaoTac --> Capture[Engine records clicks, console logs, network errors, & focus states]
    Capture --> Stop([⏹ Stop Recording])
    Stop --> Snapshot[Capture Viewport Screenshot]
    Snapshot --> Report[Generate Report v3 JSON/Markdown]
```

---

## ✨ Features

- **Start/Stop UI**: Clean status indicator and real-time timer in the popup interface.
- **Console Capture**: Records `console.log`, `console.warn`, and `console.error` with high-precision timestamping.
- **JS Exception Capture**: Intercepts unhandled runtime exceptions (`window.onerror` and rejected promises).
- **Interaction Click-Trail**: Chronological tracking of target selectors without leaking user inputs.
- **Failed Request Logging**: Monitors status `>= 400` network requests and connection aborts.
- **AI Explain Integration**: Translates complex runtime stack traces into plain English explanations via AI.
- **Dual Export**: Instantly exports reports as clean, standalone Markdown `.md` or raw JSON `.json`.

---

## 🚀 Getting Started

### 📦 Installation
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on at the top-right corner.
3. Click **Load unpacked** on the top-left.
4. Select the directory:
   ```text
   bug-black-box
   ```
5. Pin the **Bug Black Box** icon to your toolbar for quick access.

> [!IMPORTANT]  
> **File Access**: If you want to record local `.html` files opened using `file://` protocols, ensure you toggle **Allow access to file URLs** on for Bug Black Box in `chrome://extensions`.

---

## ⚡ Multi-Tab Flow & Replay System

Bug Black Box allows developers to trace complex issues that span across multiple tabs during a single session:

- **Focus Timelines**: Tracks when tabs are entered or left, storing them under `activeRanges`.
- **Event Correlation**: Group clicks, console logs, and related network activities automatically.
- **Spam Flagging**: Flags UI elements receiving heavy repetitive user clicks (`isSpam: true`).
- **Global Synchronization**: Maps all events chronologically in a `globalTimeline` using relative timestamp markers, allowing seamless cross-tab visual replays.

---

## 🔒 Security & Privacy First

- **Sensitive Field Masking**: Headers, URLs, and bodies containing keywords like `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, or `session` are automatically masked to `[redacted]`.
- **Input Text Shielding**: Click events do not record input contents, textareas, or content-editable containers. They only store the target selector path (e.g., `input[type="password"]`).
- **Local Storage Cache**: Data is cached in `chrome.storage.local`. No external server uploads or analytical calls are performed.
