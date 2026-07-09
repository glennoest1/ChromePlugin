# Data Model - Bug Black Box

## 1. Storage Overview

Bug Black Box stores runtime data in `chrome.storage.local`. The data is session-oriented and local to the browser profile where the extension is installed.

| Storage Key | Purpose | Lifecycle |
| --- | --- | --- |
| `recordingState` | Current recording mode, root tab, start/stop timestamps, and known tabs. | Created on install or start; updated during recording and stop. |
| `eventBuffersByTab` | Captured action, console, JavaScript error, and network events grouped by tab ID. | Reset on start and clear; appended during recording. |
| `eventBuffer` | Legacy compatibility buffer. | Reset on start and clear; currently not the primary source for multi-tab reports. |
| `replayEvents` | Root-tab `rrweb` replay events. | Reset on start and clear; appended during recording. |
| `replayStatus` | Replay start, flush, and storage status. | Reset on start; updated as replay batches are stored. |
| `lastReport` | Latest compiled report shown in popup and exported as Markdown. | Written after stop; cleared by reset. |
| `apiConfig` | Gemini API key config. | Saved or cleared from options page. |

## 2. `recordingState`

`recordingState` tracks whether a recording is active and which tabs belong to the session.

```json
{
  "isRecording": true,
  "mode": "allTabs",
  "startedAt": 1751800000000,
  "rootTabId": 123,
  "tabs": {
    "123": {
      "tabId": 123,
      "url": "https://example.com/checkout",
      "title": "Checkout",
      "startedAt": 1751800000000
    }
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `isRecording` | boolean | Whether capture is active. |
| `mode` | string | `activeTab` or `allTabs`. |
| `startedAt` | number | Unix timestamp in milliseconds. |
| `stoppedAt` | number | Added when recording stops. |
| `rootTabId` | number | Tab that started the recording. |
| `tabs` | object | Tab metadata keyed by tab ID string. |

## 3. `eventBuffersByTab`

Events are grouped by tab ID. Each tab buffer is capped at 500 events.

```json
{
  "123": [
    {
      "type": "click",
      "selector": "button.pay",
      "text": "Pay now",
      "timestamp": 1751800015000
    },
    {
      "type": "console",
      "level": "error",
      "message": "Payment confirmation timed out",
      "timestamp": 1751800025000
    }
  ]
}
```

### Event: `console`

```json
{
  "type": "console",
  "level": "error",
  "message": "Payment confirmation timed out",
  "timestamp": 1751800025000
}
```

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Always `console`. |
| `level` | string | `log`, `warn`, or `error`. |
| `message` | string | Stringified and redacted console arguments. |
| `timestamp` | number | Unix timestamp in milliseconds. |

### Event: `jsError`

```json
{
  "type": "jsError",
  "message": "Cannot read properties of undefined",
  "source": "https://example.com/app.js",
  "lineno": 234,
  "colno": 12,
  "stack": "TypeError: Cannot read properties of undefined",
  "timestamp": 1751800028000
}
```

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Always `jsError`. |
| `message` | string | Error or rejection message. |
| `source` | string | Sanitized source URL when available. |
| `lineno` | number or null | Source line when available. |
| `colno` | number or null | Source column when available. |
| `stack` | string | Stack trace when available. |
| `timestamp` | number | Unix timestamp in milliseconds. |

### Event: `click`

```json
{
  "type": "click",
  "selector": "#checkout-button",
  "text": "Checkout",
  "timestamp": 1751800015000
}
```

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Always `click`. |
| `selector` | string | Simple CSS-like selector generated from ID, class, input type, role, or tag. |
| `text` | string | Safe label text. Input values, textarea content, and contenteditable content are not captured. |
| `timestamp` | number | Unix timestamp in milliseconds. |

### Event: `submit`

```json
{
  "type": "submit",
  "selector": "#payment-form",
  "text": "Form submitted",
  "timestamp": 1751800020000
}
```

Submit events identify the form element and do not include form field values.

### Event: `networkError`

```json
{
  "type": "networkError",
  "method": "POST",
  "url": "https://example.com/api/pay?token=%5Bredacted%5D",
  "statusCode": 500,
  "error": "",
  "timestamp": 1751800024000
}
```

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Always `networkError`. |
| `method` | string | HTTP method. |
| `url` | string | URL with sensitive query parameters redacted. |
| `statusCode` | number or null | HTTP status for completed failed requests. |
| `error` | string | Browser network error for failed requests without a response. |
| `timestamp` | number | Unix timestamp in milliseconds. |

## 4. `replayEvents` and `replayStatus`

`replayEvents` stores raw `rrweb` events for the root tab. These events are played by `replay/replay.html`.

`replayStatus` records whether replay started and whether storage had issues:

```json
{
  "started": true,
  "startError": null,
  "lastBatchAt": 1751800030000,
  "lastBatchSize": 25,
  "storageError": null
}
```

Replay behavior:

- inputs are masked by `rrweb` through `maskAllInputs: true`
- elements can be blocked with class `bug-black-box-block`
- elements can be ignored with class `bug-black-box-ignore`
- replay storage is capped at 5000 events
- replay capture currently belongs to the root tab only

## 5. `lastReport`

`lastReport` is compiled when the user stops recording.

```json
{
  "version": 2,
  "mode": "allTabs",
  "rootTabId": 123,
  "startedAt": 1751800000000,
  "stoppedAt": 1751800045000,
  "durationSeconds": 45,
  "events": [],
  "replayEventCount": 350,
  "replayStatus": {
    "started": true,
    "startError": null,
    "lastBatchAt": 1751800030000,
    "lastBatchSize": 25,
    "storageError": null
  },
  "tabs": [
    {
      "tabId": 123,
      "url": "https://example.com/checkout",
      "title": "Checkout",
      "events": []
    }
  ],
  "screenshotBase64": "data:image/png;base64,...",
  "screenshotError": null,
  "aiExplanation": null
}
```

| Field | Type | Description |
| --- | --- | --- |
| `version` | number | Current report contract version emitted by source code. |
| `mode` | string | `activeTab` or `allTabs`. |
| `rootTabId` | number | Root recording tab. |
| `startedAt`, `stoppedAt` | number | Recording timestamps. |
| `durationSeconds` | number | Rounded session duration. |
| `events` | array | Legacy flat event array. |
| `replayEventCount` | number | Count of stored replay events. |
| `replayStatus` | object | Replay capture and storage status. |
| `tabs` | array | Captured tab metadata and events. |
| `screenshotBase64` | string or null | Viewport image data URL when available. |
| `screenshotError` | string or null | Reason screenshot was skipped or failed. |
| `aiExplanation` | string or null | Gemini-generated explanation after AI Explain succeeds. |

## 6. Sensitive Data Handling

The data model intentionally excludes:

- password values
- typed input values
- textarea content
- contenteditable content
- cookies
- localStorage or sessionStorage dumps
- request bodies
- response bodies

Sensitive text and query parameters matching terms such as `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, and `session` are redacted before storage or report output.
