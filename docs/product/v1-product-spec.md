# Product Specification - Bug Black Box

## 1. Project Summary

Bug Black Box is a Chrome Manifest V3 extension that helps testers, developers, and product teams produce actionable bug reports for web applications. The extension records the context around a reproduction session: user interactions, console output, JavaScript errors, failed network requests, a viewport screenshot, and optional session replay data.

The product is local-first. Recording starts only after the user clicks **Start Recording**, captured data is stored in `chrome.storage.local`, and the primary output is a downloadable Markdown report that includes structured reproduction context and a raw `lastReport` JSON block.

## 2. Core Problem

Bug reports are often incomplete. A developer may receive a short message such as "the checkout page broke" without the click path, console errors, request failures, browser state, or screenshot needed to reproduce the issue.

Bug Black Box addresses that gap by turning a manual reproduction attempt into a structured evidence package. It does not replace debugging, but it reduces the time spent asking for basic context.

## 3. Target Users

| User | Need | Product Support |
| --- | --- | --- |
| QA tester | Capture precise reproduction context while testing a web app. | Start/stop recording, action trail, console and error capture, report export. |
| Frontend developer | Understand what happened before an error. | Timed events, JavaScript stack traces, failed requests, screenshot, replay viewer. |
| Product manager or support teammate | Share a readable explanation of a technical failure. | Markdown report and optional Gemini AI Explain summary. |
| Solo builder | Debug localhost or file-based demos quickly. | Support for `http://`, `https://`, and allowed `file://` pages. |

## 4. Product Scope

### In Scope

- Start and stop a recording session from the extension popup.
- Choose **Current tab** or **All tabs** recording mode before starting.
- Capture safe click and submit metadata, including selector and non-sensitive label text.
- Capture `console.log`, `console.warn`, and `console.error`.
- Capture uncaught JavaScript errors and unhandled promise rejections.
- Capture failed network requests from Chrome `webRequest` events.
- Capture a viewport screenshot when the root tab is active at stop time.
- Capture session replay events for the root tab using `rrweb`.
- Preview the generated report in the popup.
- Download a Markdown bug report.
- Open a replay viewer for the latest report when replay data exists.
- Save, clear, and use a user-provided Gemini API key for AI Explain.

### Out of Scope

- Automatic upload to a hosted backend.
- Jira, GitHub, Slack, or ticketing integrations.
- Video recording or screen sharing.
- Capturing password values, free-form input values, textarea content, cookies, request bodies, or response bodies.
- Recording on Chrome internal pages such as `chrome://extensions`.
- Cross-device or Chrome-profile synchronization.

## 5. Feature Summary

| ID | Feature | Status | Notes |
| --- | --- | --- | --- |
| FR-001 | Start/stop recording | implemented | Controlled from `popup/popup.js` through `background.js`. |
| FR-002 | Recording mode selection | implemented | Supports `activeTab` and `allTabs`. |
| FR-003 | Console capture | implemented | `injected.js` hooks console methods in the page's main world. |
| FR-004 | JavaScript error capture | implemented | Captures `error` and `unhandledrejection` events. |
| FR-005 | User action trail | implemented | Captures click and submit metadata without input values. |
| FR-006 | Failed network request capture | implemented | Records status `>= 400` and network-level failures. |
| FR-007 | Screenshot capture | implemented | Captures only when the root tab is active. |
| FR-008 | Markdown report export | implemented | Includes readable sections and raw `lastReport` JSON. |
| FR-009 | Session replay | implemented | Root-tab replay events are captured and opened in `replay/replay.html`. |
| FR-010 | AI Explain | implemented | Uses a locally saved Gemini API key. |
| FR-011 | Hosted share links | out of scope | No backend exists in the current extension. |
| FR-012 | Direct ticketing integrations | out of scope | No external issue tracker integration exists. |

## 6. User-Facing Workflow

1. User opens a normal web page, localhost page, or allowed `file://` page.
2. User opens the Bug Black Box popup.
3. User chooses **Current tab** or **All tabs**.
4. User clicks **Start Recording**.
5. User reproduces the bug.
6. User clicks **Stop & Create Report**.
7. Extension compiles captured context into `lastReport`.
8. User reviews the popup preview.
9. User downloads a Markdown report and optionally opens the replay viewer or AI Explain.

The detailed flows are documented in [user-flows.md](user-flows.md).

## 7. Report Output

The exported Markdown report contains:

- report title based on the root page title or URL
- recorded timestamp and duration
- recording mode and captured tab count
- captured tabs list
- ordered reproduction steps
- JavaScript errors
- failed network requests
- console log output
- screenshot or screenshot failure reason
- session replay availability summary
- optional plain-English AI explanation
- raw `lastReport` JSON for developers

The data structure is documented in [data-model.md](data-model.md).

## 8. Current Limitations

- Replay capture is stored for the root tab only, even when action/error events can be grouped across multiple tabs.
- Screenshot capture is skipped if the root tab is not active in its window when recording stops.
- The popup exports Markdown only; the raw JSON is embedded inside the Markdown report.
- Navigation events and opener-tab relationships appear in sample task files, but the current source does not implement a dedicated navigation event type.
- The project has no automated test suite in the current repo. Manual verification uses `test-page.html`.

## 9. Success Criteria

Bug Black Box is successful when a tester can reproduce a bug once and hand a developer a report that clearly answers:

- what page was recorded
- which mode was used
- what the user clicked or submitted
- what console and JavaScript errors occurred
- which network requests failed
- whether a screenshot or replay is available
- what raw structured data was captured
