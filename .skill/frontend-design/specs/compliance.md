# 📦 Chrome Web Store Compliance & Copywriting Guidelines

To pass the Chrome Web Store review quickly and build user trust, the frontend UI text must adhere to strict guidelines. Below is the approved copy and disclosure structure that must be placed in the UI:

### 1. Clear Permissions Disclosure (To be shown in Options/Settings or Extension onboarding)
Every permission requested in `manifest.json` must be explained in user-friendly terms within the settings panel:
- **`activeTab` & `tabs`**: *"Used exclusively to attach the recorder and sync recording timelines across the tab(s) you select. We do not track background tab activities."*
- **`storage`**: *"Used to save your local extension state and securely store your optional Gemini API key locally on your device."*
- **`scripting`**: *"Used to inject the logging interface to read console warnings, errors, and click sequences."*

### 2. Single-Purpose Compliance Description (For Store Listing & UI Subtitles)
The Web Store requires a clear single-purpose description.
- **Short Subtitle (in Popup UI)**: *"Record console logs, JavaScript exceptions, network requests, and user action trails into structured bug reports."*
- **Long Description**: *"Bug Black Box is a developer-focused flight recorder for web applications. It monitors front-end execution parameters in real-time, helping QA engineers and software developers capture, trace, and explain bugs instantly without manually compiling reproduction steps."*

### 3. Strict User Data Privacy Policy Statement (Must be accessible in UI Options)
Include a "Privacy & Security" section at the bottom of the Options/Settings UI page with the following copy:
- **Sensitive Fields Redaction**: *"Sensitive values (e.g. passwords, bearer authorization tokens, cookies) are automatically redacted locally before any data is exported or analyzed."*
- **No Remote Tracking**: *"Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs."*
- **Gemini API Transparency**: *"When using 'Explain with AI', only the specific Javascript exceptions and related stack traces are sent to the Gemini API endpoint to produce an explanation. Your credentials and full logs are never transmitted."*
