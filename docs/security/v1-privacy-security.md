# Privacy and Security - Bug Black Box

## 1. Privacy Position

Bug Black Box is designed to capture debugging context without collecting sensitive user input. The extension records only after the user starts a session, stores data locally by default, and avoids backend uploads in the current implementation.

The main privacy principle is: capture enough technical evidence to reproduce a bug, but avoid raw user secrets and form data.

## 2. Data Captured

| Category | Captured | Notes |
| --- | --- | --- |
| Page metadata | yes | URL and title for captured tabs. Sensitive URL query parameters are redacted. |
| Console logs | yes | Console arguments are stringified and sensitive keys/text are redacted where detected. |
| JavaScript errors | yes | Message, source URL, line, column, and stack when available. |
| Click actions | yes | Selector and safe text label only. |
| Submit actions | yes | Form selector and a generic submit label. |
| Failed requests | yes | Method, sanitized URL, status code or browser error, timestamp. |
| Screenshot | partial | Root-tab viewport screenshot when available. |
| Session replay | partial | Root-tab `rrweb` events with masked inputs. |
| AI Explain prompt | partial | Shortened error, step, and failed-request summaries sent only when user clicks AI Explain. |

## 3. Data Not Captured

The current implementation does not intentionally capture:

- password field values
- normal input values
- textarea values
- contenteditable values
- cookies
- localStorage or sessionStorage dumps
- request bodies
- response bodies
- full browser history
- Chrome internal page contents

## 4. Redaction Rules

### Console and Object Redaction

`injected.js` redacts sensitive object keys and text patterns matching terms such as:

- `password`
- `token`
- `secret`
- `authorization`
- `cookie`
- `apiKey`
- `api-key`

Detected values are replaced with `[redacted]`.

### URL Redaction

`background.js` sanitizes URLs and redacts query parameter values when parameter names match sensitive terms such as:

- `password`
- `token`
- `secret`
- `authorization`
- `cookie`
- `apiKey`
- `api_key`
- `session`

### Replay Masking

`session-recorder.js` uses `rrweb.record({ maskAllInputs: true })`, which masks input values in replay data. Pages can also mark elements with:

- `bug-black-box-block` to block capture
- `bug-black-box-ignore` to ignore capture

## 5. Local Storage

Runtime and report data lives in `chrome.storage.local`.

| Key | Sensitivity |
| --- | --- |
| `recordingState` | may include visited page URLs and titles |
| `eventBuffersByTab` | may include console/error text and sanitized URLs |
| `replayEvents` | may include visual interaction metadata with masked inputs |
| `lastReport` | may include all report context and screenshot data |
| `apiConfig.apiKey` | secret, user-provided Gemini API key |

Users should treat downloaded Markdown reports as potentially sensitive debugging artifacts because reports may include page URLs, visible screenshot content, console messages, and stack traces.

## 6. External Communication

The current extension has one optional external communication path:

| Integration | Trigger | Data Sent |
| --- | --- | --- |
| Gemini AI Explain | User clicks **Explain with AI** | A shortened diagnostic prompt built from reproduction steps, JavaScript errors, console errors, and network errors. |

No AI request is made automatically when recording or exporting a report.

## 7. Permissions Rationale

| Permission | Reason |
| --- | --- |
| `storage` | Persist recording state, report data, replay events, and settings. |
| `activeTab` | Access the currently selected tab for recording and screenshot capture. |
| `tabs` | Read tab metadata and capture the root tab viewport. |
| `scripting` | Ensure content and replay scripts are available in the target tab. |
| `webRequest` | Observe failed network requests. |
| `unlimitedStorage` | Reduce quota pressure for replay data and reports. |
| `<all_urls>` host permission | Allow recording on normal pages where Chrome permits extension scripts. |
| `https://generativelanguage.googleapis.com/*` | Allow optional Gemini AI Explain calls. |

## 8. Security Boundaries and Known Risks

- Redaction is best-effort. Console logs may contain sensitive information in formats not covered by the current patterns.
- Screenshots can include sensitive visible page content. Users should review reports before sharing.
- The Gemini API key is stored locally in extension storage. The project does not currently integrate with a secure external secret manager.
- Downloaded Markdown reports can include raw `lastReport` JSON and embedded screenshot data.
- The extension does not control what third-party pages render during replay capture.

## 9. Sharing Guidance

Before sharing an exported report, users should check:

- visible screenshot content
- page URLs and query strings
- console messages
- stack traces
- raw JSON section
- AI explanation text

If a report includes sensitive business or user data, redact it manually before sending it outside the trusted team.
