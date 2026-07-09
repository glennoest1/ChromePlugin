# Functional Requirements - Bug Black Box

## 1. Requirement Status Legend

| Status | Meaning |
| --- | --- |
| implemented | Present in current source code. |
| partial | Present with a known limitation. |
| out of scope | Explicitly not part of the current implementation. |
| unspecified | Not enough project evidence to define the behavior. |

## 2. Recording Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| FR-001 | The user can start a recording session from the popup. | implemented | `popup.js` sends `startRecording`; `background.js` initializes state and buffers. |
| FR-002 | The user can stop a recording session and generate a report. | implemented | `stopRecording` compiles `lastReport` and returns it to the popup. |
| FR-003 | The user can choose Current tab or All tabs before recording. | implemented | `activeTab` limits events to the root tab; `allTabs` accepts events from recordable tabs. |
| FR-004 | The extension rejects unsupported or restricted pages. | implemented | Only `http:`, `https:`, and allowed `file:` pages are recordable. |
| FR-005 | Recording state survives popup close/reopen during an active session. | implemented | State is persisted in `chrome.storage.local`. |

## 3. Capture Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| FR-006 | Capture `console.log`, `console.warn`, and `console.error`. | implemented | `injected.js` wraps console methods and forwards records through `window.postMessage`. |
| FR-007 | Capture uncaught JavaScript errors. | implemented | `window.addEventListener("error")` emits `jsError`. |
| FR-008 | Capture unhandled promise rejections. | implemented | `window.addEventListener("unhandledrejection")` emits `jsError`. |
| FR-009 | Capture user click events. | implemented | `content.js` records selector and safe label text. |
| FR-010 | Capture form submit events. | implemented | `content.js` records form selector and `"Form submitted"`. |
| FR-011 | Capture failed HTTP responses. | implemented | `webRequest.onCompleted` records status codes `>= 400`. |
| FR-012 | Capture browser-level request failures. | implemented | `webRequest.onErrorOccurred` records network errors. |
| FR-013 | Capture root-tab screenshot when recording stops. | partial | Works when the root tab is active; otherwise a screenshot error is stored. |
| FR-014 | Capture session replay events. | partial | Root-tab replay is implemented; multi-tab replay is not implemented. |

## 4. Report Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| FR-015 | Generate a structured `lastReport`. | implemented | Report includes version, mode, timestamps, tabs, screenshot state, replay status, and AI explanation field. |
| FR-016 | Preview report details in the popup. | implemented | Popup shows summary, tabs, steps, errors, network failures, screenshot, replay status, and AI panel. |
| FR-017 | Export a Markdown report. | implemented | `downloadReport` builds and downloads `.md`. |
| FR-018 | Export raw JSON as a separate file. | out of scope | The current UI embeds raw `lastReport` JSON inside the Markdown export instead. |
| FR-019 | Preserve full report detail in export even when popup preview truncates text. | implemented | Preview text is limited; Markdown uses full report content. |

## 5. Replay Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| FR-020 | Start replay capture with recording. | implemented | `startRecording` sends `startSessionReplay` to the root tab. |
| FR-021 | Stop replay capture when recording stops. | implemented | `stopRecording` sends `stopSessionReplay` before report generation. |
| FR-022 | Mask input values in replay. | implemented | `rrweb.record` uses `maskAllInputs: true`. |
| FR-023 | Open a replay viewer for the latest report. | implemented | Popup opens `replay/replay.html` when replay events exist. |
| FR-024 | Support replay speed and seeking controls. | implemented | Replay page provides play/pause, restart, seek, and speed selection. |

## 6. AI Explain Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| FR-025 | Save a Gemini API key locally. | implemented | Options page stores `apiConfig.apiKey`. |
| FR-026 | Clear the saved Gemini API key. | implemented | Options page sets an empty key. |
| FR-027 | Explain reports with JavaScript or console errors. | implemented | Background worker sends a summarized prompt to Gemini. |
| FR-028 | Handle missing, invalid, rate-limited, or network-failed AI requests. | implemented | Popup maps known errors to user-facing messages. |
| FR-029 | Explain reports without any error. | out of scope | The code rejects AI Explain with `NO_ERRORS`. |

## 7. Privacy Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| FR-030 | Do not capture typed input values. | implemented | Input elements are represented by type, not value. |
| FR-031 | Do not capture textarea or contenteditable text. | implemented | Text is replaced with generic element labels. |
| FR-032 | Redact sensitive console object keys. | implemented | Keys matching password/token/secret/authorization/cookie/api key terms become `[redacted]`. |
| FR-033 | Redact sensitive URL query parameters. | implemented | `sanitizeUrl` redacts sensitive query values. |
| FR-034 | Avoid request and response body capture. | implemented | Network events store method, URL, status/error, and timestamp only. |

## 8. Non-Functional Requirements

| ID | Requirement | Status | Acceptance Notes |
| --- | --- | --- | --- |
| NFR-001 | Work without a backend service. | implemented | All state is local except optional Gemini calls. |
| NFR-002 | Keep event buffers bounded. | implemented | Event buffers are capped at 500 events per tab. |
| NFR-003 | Keep replay storage bounded. | implemented | Replay events are capped at 5000 events with fallback reduction on storage failure. |
| NFR-004 | Use plain browser technologies. | implemented | The extension uses vanilla HTML/CSS/JS and vendored replay libraries. |
| NFR-005 | Support local demo verification. | implemented | `test-page.html` exercises core capture paths. |
