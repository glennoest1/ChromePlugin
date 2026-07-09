# Chrome Web Store Listing Draft - Bug Black Box

## Title

Bug Black Box

## Short Summary

Record console logs, JavaScript errors, user actions, failed requests, screenshots, and replay into a local bug report.

## Detailed Description

Bug Black Box helps QA, product teams, and developers capture the context around a web bug without manually copying console output or recreating every step from memory.

Start a recording, reproduce the issue, then stop recording to generate a structured bug report. The report includes:

- User click and submit steps.
- Console logs and console errors.
- JavaScript error messages and stack traces.
- Failed network request metadata.
- A screenshot from the recorded root tab.
- Session replay data for local playback.
- Captured events grouped by tab when all-tabs recording is used.
- Markdown export with the raw report JSON included.

Bug Black Box records only after the user explicitly clicks Start Recording. Reports, replay data, screenshots, and the optional Gemini API key are stored locally in Chrome extension storage. The extension does not upload reports or replay data to a Bug Black Box backend in this phase.

AI Explain is optional. If the user saves a Gemini API key and clicks Explain with AI, selected report context is sent to Gemini to produce a short explanation of the captured error.

## Category

Developer Tools

## Language

English

## Website URL

TBD after deployment. Recommended GitHub Pages URL:

```text
https://<OWNER>.github.io/<REPOSITORY>/
```

## Privacy Policy URL

TBD after deployment. Recommended GitHub Pages URL:

```text
https://<OWNER>.github.io/<REPOSITORY>/privacy.html
```

## Single Purpose Statement

Bug Black Box records browser bug context after explicit user action and exports it as a local report for debugging.

## Permission Justifications

- `storage`: Store recording state, captured reports, replay events, screenshots, and the optional Gemini API key locally.
- `activeTab`: Access the current tab after the user starts recording from the extension popup.
- `tabs`: Read tab metadata, identify the recorded root tab, support all-tabs recording, and open the replay viewer.
- `scripting`: Inject capture scripts into recordable pages when needed.
- `webRequest`: Capture failed request metadata during an active recording session.
- `unlimitedStorage`: Reduce the chance that local screenshots and replay events are truncated during longer debugging sessions.
- `<all_urls>` host permission: Allow recording on user-selected web pages, localhost, and test pages where bugs occur.
- `https://generativelanguage.googleapis.com/*`: Call Gemini only when the user clicks AI Explain after saving a Gemini API key.

## Data Usage Disclosure Draft

Bug Black Box handles website content and user activity during explicit recording sessions. Captured data can include page URL/title, visible page state in screenshots, DOM replay events, click/submit metadata, console output, JavaScript errors, and failed network request metadata. Data is stored locally unless the user exports a report or explicitly uses AI Explain.

## Reviewer Test Instructions

```text
1. Install the extension.
2. Open a normal website or the provided test page.
3. Click the Bug Black Box icon.
4. Click Start Recording.
5. Click around and trigger a console error or JavaScript error.
6. Click Stop & Create Report.
7. Verify the report preview and download the Markdown report.
8. Click View Session Replay if replay events were captured.
9. To test AI Explain, open Options, save a Gemini API key, create a report with an error, then click Explain with AI.
```

## Pre-Publish Placeholder

The website `Add to Chrome` CTA currently uses `href="#"`. Replace it with the real Chrome Web Store URL after the item is created.
