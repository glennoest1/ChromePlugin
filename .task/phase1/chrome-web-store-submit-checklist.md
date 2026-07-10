# Chrome Web Store Submit Checklist

## Website

- [ ] Deploy `docs/` to the selected public host.
- [ ] Confirm the public website URL opens.
- [ ] Confirm the public `privacy.html` URL opens directly.
- [ ] Replace the `Add to Chrome` placeholder in `docs/index.html` after the Chrome Web Store URL exists.
- [ ] Recheck website links on desktop and mobile widths.

## Release QA

- [ ] Load unpacked from `bug-black-box/`.
- [ ] Start and stop recording on a normal page.
- [ ] Start on a restricted page and confirm the error is clear.
- [ ] Capture console logs.
- [ ] Capture JavaScript errors.
- [ ] Capture failed network requests.
- [ ] Capture screenshot from the active root tab.
- [ ] Export Markdown.
- [ ] Open and play session replay when replay events are captured.
- [ ] Confirm AI Explain missing-key state.
- [ ] Confirm AI Explain valid-key state if a Gemini key is available.
- [ ] Confirm fake sensitive values do not appear in exports.

## Package

- [x] Review `bug-black-box/manifest.json` for release metadata.
- [x] Run `.\package.ps1` with process-level execution-policy bypass if local policy blocks scripts.
- [x] Inspect `dist/bug-black-box-v1.0.0.zip`.
- [x] Confirm ZIP contains extension files only, not repository planning files.

## Chrome Developer Dashboard

- [ ] Upload ZIP to Chrome Developer Dashboard.
- [ ] Complete Package tab.
- [ ] Complete Store Listing tab using `.task/phase1/store-listing-draft.md`.
- [ ] Complete Privacy tab with accurate data disclosures.
- [ ] Complete Distribution tab.
- [ ] Add reviewer test instructions.
- [ ] Submit for review with deferred publishing for first release.

## Known Placeholders

- [ ] Website URL is pending deployment.
- [ ] Privacy policy URL is pending deployment.
- [ ] Chrome Web Store URL is pending item creation.
