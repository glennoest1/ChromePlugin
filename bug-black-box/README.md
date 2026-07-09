# Bug Black Box

Bug Black Box is a Chrome Manifest V3 extension for recording the useful context around a web app bug: user actions, console logs, JavaScript errors, failed network requests, and a screenshot. It exports a Markdown report that can be shared with a developer or used for AI-assisted debugging.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:

   ```text
   E:\Bug Black Box\bug-black-box
   ```

5. After any code change, click the extension reload button in `chrome://extensions`.

Chrome 111 or newer is required because `injected.js` runs with `"world": "MAIN"` to capture page console calls.

## Demo

Use the included demo page:

```text
E:\Bug Black Box\test-page.html
```

Recommended demo flow:

1. Serve the workspace locally:

   ```powershell
   cd "E:\Bug Black Box"
   python -m http.server 8080
   ```

2. Open:

   ```text
   http://127.0.0.1:8080/test-page.html
   ```

3. Click the Bug Black Box toolbar icon.
4. Click **Start Recording**.
5. On the demo page, click:
   - **Write Console Log**
   - **Trigger TypeError**
   - **Trigger Rejected Promise**
   - **Trigger Missing File Request**
   - **Submit Demo Form**
6. Click the extension icon again.
7. Click **Stop & Create Report**.
8. Review the preview and click **Download Report (.md)**.

The popup preview may shorten very long error blocks with `...` so the extension UI stays readable. The downloaded Markdown report keeps the full captured console messages, JavaScript error messages, stack traces, and network error lines.

If you open `test-page.html` directly as `file://`, enable **Allow access to file URLs** for this extension in `chrome://extensions`, then reload the page.

## Usage

1. Open a normal website, localhost page, or the demo page.
2. Click the extension icon.
3. Click **Start Recording**.
4. Reproduce the bug.
5. Click **Stop & Create Report**.
6. Download the Markdown report.

Do not start recording from `chrome://extensions` or other `chrome://` pages. Chrome blocks content scripts on internal browser pages.

## Gemini AI Explain

AI Explain uses the Gemini API to turn captured errors into a short plain-language explanation.

The extension does not hardcode an API key. You must provide your own Gemini key.

1. Open the Bug Black Box popup.
2. Click the settings button.
3. Enter your **Gemini API key**.
4. Click **Save Key**.
5. Create a report with at least one JavaScript error or `console.error`.
6. Click **Explain with AI** in the report preview.

For very large reports, the prompt sent to Gemini may shorten long fields with `...` to stay within practical API limits. This does not change the downloaded Markdown report, which keeps the full captured report content.

Implementation details:

```text
Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent
Header:   x-goog-api-key: <YOUR_GEMINI_API_KEY>
Storage:  chrome.storage.local -> apiConfig.apiKey
```

## Privacy

Recording starts only after the user clicks **Start Recording**.

The extension does not capture:

- Password input values.
- Text typed into normal inputs.
- Textarea content.
- `contenteditable` content.
- Cookies.
- localStorage/sessionStorage dumps.
- Full unbounded request or response bodies.

Click and submit events store action metadata only. Network logging stores important fetch/XHR request and response metadata: method, sanitized URL, redacted headers, truncated redacted bodies, status code, duration, and browser network error text.

Sensitive URL query parameters are redacted when their names include:

```text
password, token, secret, authorization, cookie, apiKey, session
```

## Files

```text
bug-black-box/
  manifest.json
  background.js
  content.js
  injected.js
  popup/
  options/
  icons/
  scripts/generate_icons.py
```

Key flow:

```text
injected.js (MAIN world)
  -> window.postMessage
content.js (isolated world)
  -> chrome.runtime.sendMessage
background.js
  -> chrome.storage.local
popup.js
  -> preview/export Markdown
```

## Troubleshooting

- **Cannot record on this page**: make sure the active tab is a normal `http://`, `https://`, or allowed `file://` page.
- **Testing file:// fails**: enable **Allow access to file URLs** for Bug Black Box and reload the file tab.
- **Console logs missing**: reload the target tab after reloading the extension.
- **AI Explain says missing key**: save a Gemini API key in Settings.
- **Network requests missing**: fetch/XHR requests are captured from recorded tabs; browser/static asset requests may only appear when Chrome reports them as failures.

## Recording Modes

The popup supports two recording modes before Start:

- **Current tab** records only the tab where recording starts.
- **All tabs** records events from multiple recordable tabs in the same session.

Reports now use contract v3 and group events by `tabs[]`. Each event includes `tabId` and `relativeTime`; actions include `eventId`; network and console events may include `triggeredByActionId`; tab metadata includes `activeRanges`; and `globalTimeline[]` provides chronological cross-tab references. The screenshot is still captured only from the root tab. See `.task/samples/phase-1-report-v3.sample.json` for the shared sample payload.

In all-tabs mode, event limits are enforced per tab. Reset clears both the old `eventBuffer` compatibility key and the new `eventBuffersByTab` storage.
