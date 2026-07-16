# Bug Black Box Documentation

This folder describes the current Bug Black Box project as implemented in the repository. The documentation focuses on the Chrome extension under `bug-black-box/` and the included local demo page.

## Reading Path

1. [Product specification](product-spec.md) - product goal, scope, users, current capabilities, and limitations.
2. [Technical architecture](tech-architecture.md) - runtime contexts, extension messaging, storage, manifest permissions, and integration boundaries.
3. [Data model](data-model.md) - `chrome.storage.local` keys, event schemas, replay data, report contract, and privacy exclusions.
4. [Functional requirements](functional-requirements.md) - stable requirement IDs and acceptance notes.
5. [User flows](user-flows.md) - recording, report generation, replay, AI Explain, settings, and reset flows.
6. [UI specification](ui-spec.md) - popup, options page, replay page, and error states.
7. [Privacy and security](privacy-security.md) - data handling, redaction, local storage, permissions, and known boundaries.
8. [Testing and demo guide](testing-and-demo.md) - manual verification using the included demo page.

## Project Map

```text
Chrome-Plugin-Bug-Black-Box-Extension/
  README.md
  test-page.html
  docs/
  bug-black-box/
    manifest.json
    background.js
    content.js
    injected.js
    session-recorder.js
    popup/
    options/
    replay/
    vendor/
```

## Current Implementation Snapshot

| Area | Current State |
| --- | --- |
| Extension platform | Chrome Manifest V3, minimum Chrome 111. |
| Recording modes | Current tab and all tabs. |
| Captured events | Console logs, JavaScript errors, clicks, submits, failed requests. |
| Visual context | Root-tab screenshot and root-tab `rrweb` session replay when available. |
| Export | Markdown report with raw `lastReport` JSON included. |
| AI explain | Optional Gemini integration using a user-provided API key. |
| Persistence | Local browser storage through `chrome.storage.local`. |
| Backend | None in the current implementation. |

## Documentation Boundaries

These docs intentionally avoid describing unimplemented backend share links, ticketing integrations, production deployment infrastructure, or hosted observability. Those ideas appear in planning files under `.task/`, but they are not part of the current extension behavior.

Where source code does not provide enough information, the docs use `unspecified` or call out the limitation directly instead of inventing behavior.
