# Testing and Demo Guide - Bug Black Box

## 1. Purpose

This guide describes how to manually verify the current extension behavior with the included `test-page.html`. The repo does not currently include an automated test suite, so this guide focuses on repeatable local QA steps.

## 2. Install the Extension

1. Open Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder `bug-black-box/`.
6. Pin the Bug Black Box extension for easier access.

After editing extension code, reload the extension from `chrome://extensions` and reload the test page.

## 3. Run the Demo Page

Recommended local server flow:

```powershell
python -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080/test-page.html
```

You can also open `test-page.html` through `file://`, but Chrome requires **Allow access to file URLs** to be enabled for the extension.

## 4. Core Capture Test

1. Open the demo page.
2. Open the extension popup.
3. Select **Current tab**.
4. Click **Start Recording**.
5. On the demo page, click:
   - **Write Console Log**
   - **Trigger TypeError**
   - **Trigger Rejected Promise**
   - **Trigger Missing File Request**
   - **Submit Demo Form**
6. Open the extension popup again.
7. Click **Stop & Create Report**.

Expected result:

- Popup shows **Report Ready**.
- The report summary includes actions, logs, errors, and a network failure.
- Screenshot appears if the root tab stayed active.
- Replay button appears when replay events were captured.
- **Download Report (.md)** creates a Markdown file.

## 5. Privacy Test

1. Start a recording on `test-page.html`.
2. Type sample text into **Demo text input**.
3. Type sample text into **Demo password input**.
4. Submit the form.
5. Stop recording and download the report.

Expected result:

- The report may show input selectors such as `input[type="text"]` or `input[type="password"]`.
- The typed input values should not appear.
- Form submission should appear as metadata only.

## 6. Network Failure Test

1. Start a recording on `test-page.html`.
2. Click **Trigger Missing File Request**.
3. Stop recording.

Expected result:

- Report includes a `networkError` entry for the missing demo file.
- The event includes method, URL, status or browser error, and timestamp.
- Request and response bodies are not present.

## 7. Restricted Page Test

1. Open `chrome://extensions`.
2. Open the Bug Black Box popup.
3. Click **Start Recording**.

Expected result:

- Recording does not start.
- Popup shows a restricted-page message.

## 8. All Tabs Test

1. Open `test-page.html` in one tab.
2. Open another normal `http://` or `https://` page in a second tab.
3. Return to the demo tab.
4. Start recording with **All tabs**.
5. Trigger events on the demo tab and the second tab.
6. Stop recording.

Expected result:

- Report `mode` is `allTabs`.
- Report `tabs[]` contains captured tab entries.
- Events are grouped by tab where Chrome allowed scripts to run.
- Replay remains associated with the root tab.

## 9. Replay Test

1. Complete the core capture test.
2. If **View Session Replay** appears, click it.
3. Use play, pause, seek, restart, and speed controls.

Expected result:

- Replay page opens in a normal browser tab.
- Replay renders if at least two timestamped replay events were stored.
- Empty state appears if replay data is missing or incomplete.

## 10. AI Explain Test

1. Open the extension settings page.
2. Save a valid Gemini API key.
3. Record a session that includes a JavaScript error.
4. Stop recording.
5. Click **Explain with AI**.

Expected result:

- Popup shows a short plain-language explanation.
- `lastReport.aiExplanation` is updated.

Failure cases to verify:

- no saved API key
- invalid key
- network outage
- rate limit
- report with no JavaScript or console errors

## 11. Manual Regression Checklist

Before considering a release ready, verify:

- start/stop works on a normal page
- restricted pages are rejected
- file URL guidance appears when needed
- Current tab mode ignores other tabs
- All tabs mode groups events by tab
- input values do not appear in report output
- console errors and JavaScript errors appear in the report
- failed request appears in the report
- screenshot success and screenshot failure are both handled
- Markdown export downloads correctly
- replay viewer opens only when replay data exists
- AI Explain handles success and known failure states
