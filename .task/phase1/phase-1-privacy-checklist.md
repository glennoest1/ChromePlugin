# Phase 1 Privacy Checklist

Use this checklist for the final Task 06 audit after the Task 03 integrated build is loaded in Chrome.

Audit page:

```text
http://127.0.0.1:8080/test-pages/phase-1-replay.html
```

Sensitive test values that must not appear in exported reports:

```text
fake-password-123
fake-token-123
fake-api-key-123
textarea-secret-fake-123
contenteditable-secret-fake-123
privacy-user@example.test
```

## Export Evidence

- JSON export filename:
- Markdown export filename:
- Chrome version:
- Extension commit/branch:
- Recording mode tested:
- Auditor:
- Date:

## Required Privacy Checks

- [ ] No raw password values are stored in exported JSON.
  - Evidence:
- [ ] No raw password values are stored in exported Markdown.
  - Evidence:
- [ ] No token, API key, secret, authorization, cookie, or session value survives in URLs.
  - Evidence:
- [ ] Sensitive query parameters are replaced with `[redacted]`.
  - Evidence:
- [ ] No raw input values are stored in debug events.
  - Evidence:
- [ ] No raw textarea values are stored in debug events.
  - Evidence:
- [ ] No raw contenteditable text is stored in debug events.
  - Evidence:
- [ ] Replay export does not expose raw input, textarea, password, token, or contenteditable values.
  - Evidence:
- [ ] `maskAllInputs` is enabled in `bug-black-box/session-recorder.js`.
  - Evidence:
- [ ] Contenteditable replay masking is enabled with `maskTextSelector`.
  - Evidence:
- [ ] No Phase 1 report or replay data is uploaded to an external service.
  - Evidence:
- [ ] Report and replay data live only in `chrome.storage.local` and local downloads unless the user explicitly uses AI Explain.
  - Evidence:
- [ ] Searching exported JSON for every fake sensitive value returns no hits.
  - Evidence:
- [ ] Searching exported Markdown for every fake sensitive value returns no hits.
  - Evidence:

## Manual Test Plan

- [ ] Current tab recording captures click and submit events.
- [ ] Current tab recording captures `console.log`.
- [ ] Current tab recording captures `console.warn`.
- [ ] Current tab recording captures `console.error`.
- [ ] Current tab recording captures thrown JavaScript errors.
- [ ] Current tab recording captures unhandled promise rejections.
- [ ] Current tab recording captures failed network requests.
- [ ] All tabs recording captures events from the primary tab.
- [ ] All tabs recording captures events from the secondary tab opened from the test page.
- [ ] Session replay opens after stopping recording.
- [ ] Session replay plays successfully.
- [ ] Session replay pause works.
- [ ] Session replay seek works.
- [ ] Long DOM churn session does not crash the extension.
- [ ] Long DOM churn session does not exceed storage quota without setting truncation/storage flags.
- [ ] Stopping after one recorded tab is closed still produces a report.
- [ ] Starting on `chrome://extensions` shows a clear restricted-page error.

## Suggested Search Commands

PowerShell:

```powershell
$files = @(
  "C:\Users\admin\Downloads\bug-report-YYYYMMDD-HHMMSS.json",
  "C:\Users\admin\Downloads\bug-report-YYYYMMDD-HHMMSS.md"
)

$needles = @(
  "fake-password-123",
  "fake-token-123",
  "fake-api-key-123",
  "textarea-secret-fake-123",
  "contenteditable-secret-fake-123",
  "privacy-user@example.test"
)

foreach ($needle in $needles) {
  Select-String -Path $files -Pattern $needle -SimpleMatch
}
```

Expected result: no matches.

## Release Gate

Task 05 release QA must not start until every required privacy check and manual test item above is checked with evidence from exported files.
