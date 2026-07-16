export const LANGUAGE_KEY = "bbbWebLanguage";

export const COPY = {
  en: {
    languageLabel: "Language",
    english: "English",
    vietnamese: "Vietnamese",
    chinese: "Chinese",
    useLight: "Use light theme",
    useDark: "Use dark theme",
    navFeatures: "Features",
    navPrivacy: "Privacy",
    navPolicy: "Policy",
    navReports: "Reports",
    backWebsite: "Back to Website",
    reportMetaDescription: "Load and inspect a shared Bug Black Box report by shareId.",
    reportEyebrow: "Shared report viewer",
    reportTitle: "Report JSON",
    reportLead: "Enter a shareId to fetch the shared report and inspect the formatted JSON response.",
    reportShareIdLabel: "shareId",
    reportPlaceholder: "Paste shareId and press Enter",
    reportLoading: "Loading...",
    reportLoad: "Load",
    reportNoLoaded: "No report loaded",
    reportFetching: "Fetching",
    reportJsonStatus: "JSON",
    reportReady: "Ready",
    reportEmptyMessage: "Load a shareId from the input, or open this page with ?shareId=... or /reports/shareId.",
    reportEnterShareId: "Enter a shareId.",
    reportInvalidJson: "Backend response is not valid JSON.",
    reportLoadFailed: "Unable to load report.",
    reportRequestFailed: "Request failed with status",
    reportDocumentTitle: "Shared Report",
    brandHomeLabel: "Bug Black Box home",
    primaryNavLabel: "Primary navigation",
    terminalPreviewLabel: "Example bug report preview",
    reportScreenshotsAriaLabel: "Report screenshots",
    reportScreenshotsTitle: "Screenshots",
    reportScreenshotsRendered: "{count} rendered outside JSON",
    reportScreenshotAlt: "Screenshot {index}",
    reportScreenshotCaptured: "captured",
    reportScreenshotTab: "tab {tabId}",
    reportScreenshotPrimaryReason: "primary",
    reportPrimaryScreenshotTitle: "Primary screenshot",
    reportJsonPreviewStatus: "Preview JSON",
    reportJsonPreviewNote: "Preview omits large base64 fields and truncates long arrays/strings so the report stays readable.",
    reportJsonOmittedFields: "Omitted heavy fields: {count}.",
    reportJsonTruncatedArrays: "Truncated arrays: {count}.",
    reportJsonOmittedEvents: "Omitted events: {count}.",
    reportDownloadJson: "Download JSON",
    reportPreviewPayloadNote: "Large fields are omitted for browser rendering. Use the extension export or backend API for the full payload.",
    reportPreviewTruncatedAt: "[preview truncated at {size}]",
    reportPreviewOmittedReplayEvents: "[omitted {count} replay events]",
    reportPreviewMoreEventsOmitted: "{count} more events omitted",
    reportPreviewRenderedImage: "[rendered as image above, {size}]",
    reportPreviewOmittedKey: "[omitted {key}, {size}]",
    reportPreviewTruncatedString: "[truncated {size} string]",
    reportPreviewCircular: "[circular]",
    reportPreviewMoreItemsOmitted: "{count} more items omitted",
    reportPreviewMoreKeysOmitted: "{count} more keys omitted",
    indexTitle: "Bug Black Box",
    indexDescription:
      "Record console logs, JavaScript exceptions, network requests, and user action trails into structured bug reports.",
    eyebrow: "Chrome extension for web bug reports",
    lead:
      "Record console logs, JavaScript exceptions, network requests, and user action trails into structured bug reports.",
    addChrome: "Add to Chrome",
    privacyPolicy: "Privacy Policy",
    terminal: `# Bug Report
Mode: All tabs
Captured tabs: 3

## Steps to Reproduce
1. Clicked "Checkout"
2. Submitted "payment-form"

## JavaScript Errors
TypeError: Cannot read properties of undefined

## Network Errors
POST /api/orders status 500

## Session Replay
Captured replay events for local playback.`,
    featuresTitle: "What It Captures",
    features: [
      ["Browser evidence", "Console logs, console errors, JavaScript errors, failed requests, and a screenshot from the recorded root tab."],
      ["User actions", "Click and submit metadata are recorded as reproducible steps without storing typed input values."],
      ["Session replay", "rrweb session data is captured locally and played back in the extension replay viewer."],
      ["Multi-tab mode", "Record one tab or collect events from multiple recordable tabs in the same session."],
      ["Markdown export", "Download a Markdown report with the raw report JSON included for developer handoff."],
      ["AI Explain", "Optionally send selected report context to Gemini after you save your own API key and click Explain with AI."]
    ],
    privacyTitle: "Privacy by Explicit Recording",
    privacyLead:
      "Bug Black Box is a developer-focused flight recorder for web applications. It monitors front-end execution parameters in real-time, helping QA engineers and software developers capture, trace, and explain bugs instantly without manually compiling reproduction steps.",
    facts: [
      ["Local storage", "Reports, replay events, screenshots, and the optional Gemini API key are stored with chrome.storage.local."],
      ["Masked inputs", "Sensitive values (e.g. passwords, bearer authorization tokens, cookies) are automatically redacted locally before any data is exported or analyzed."],
      ["No backend", "Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs."]
    ],
    permissionTitle: "Permission Transparency",
    permissionLead:
      "Every browser permission supports the single purpose of recording browser bug context after explicit user action.",
    permissions: [
      ["activeTab and tabs", "Used exclusively to attach the recorder and sync recording timelines across the tab(s) you select. We do not track background tab activities."],
      ["storage and unlimitedStorage", "Used to save your local extension state, session replay data, reports, screenshots, and optional Gemini API key locally on your device."],
      ["scripting", "Used to inject the logging interface to read console warnings, errors, and click sequences."],
      ["webRequest", "Used to observe request status, failed requests, and timing metadata while recording the tabs you choose."],
      ["Host permissions", "Used only for pages you choose to record and for the Gemini endpoint when AI Explain is used."]
    ],
    footer: "Chrome Web Store URL pending. Replace the Add to Chrome placeholder after the store item is created.",
    policyTitle: "Privacy Policy",
    policyLead: "This policy describes the data handled by the Bug Black Box Chrome extension. Last updated: July 10, 2026.",
    explicitTitle: "Recording is explicit",
    explicitText: "Bug Black Box records only after the user clicks Start Recording.",
    noBackendPhaseTitle: "No Bug Black Box backend",
    noBackendPhaseText: "This phase does not upload reports, screenshots, or replay data to a Bug Black Box server.",
    recordsTitle: "Data the Extension Records",
    recordsIntro: "During an active recording session, Bug Black Box may collect browser context needed to reproduce and debug a web issue:",
    records: [
      "Page URL and title for recorded tabs.",
      "Console logs and console errors emitted by the page.",
      "JavaScript error messages and stack traces.",
      "User click and submit metadata, such as a selector and safe visible label text.",
      "Failed network request metadata, including method, sanitized URL, status code, and browser network error text.",
      "A screenshot of the visible viewport from the root tab when recording stops, when Chrome allows capture.",
      "rrweb session replay events for local playback in the extension replay viewer."
    ],
    avoidsTitle: "Data the Extension Avoids Recording",
    avoidsIntro: "Bug Black Box is designed to avoid intentionally storing sensitive values that are not needed for bug reports:",
    avoids: [
      "Password input values.",
      "Text typed into normal input fields.",
      "Text area content.",
      "contenteditable content.",
      "Cookies.",
      "Full localStorage or sessionStorage dumps.",
      "Request bodies, response bodies, and request cookies."
    ],
    replayTitle: "Session Replay",
    replayPolicy: [
      "Session replay is recorded through rrweb. Replay data can include DOM session data, mouse interactions, scroll activity, and page changes needed for playback. rrweb input masking is enabled with maskAllInputs: true, and the extension also records action logs without typed input values.",
      "Replay data is stored locally in Chrome extension storage and is played back by the local replay viewer bundled with the extension. Replay data is not uploaded to a Bug Black Box backend in this phase."
    ],
    aiTitle: "AI Explain",
    aiPolicy: [
      "AI Explain is optional. The extension calls Gemini only when the user saves a Gemini API key and clicks Explain with AI on a report.",
      "When using Explain with AI, only the specific JavaScript exceptions and related stack traces are sent to the Gemini API endpoint to produce an explanation. Your credentials and full logs are never transmitted. Screenshots and rrweb replay events are not sent by the AI Explain request."
    ],
    storageSharingTitle: "Storage and Sharing",
    storageSharing: [
      "Reports, replay events, screenshots, recording state, and the optional Gemini API key are stored in chrome.storage.local. The user can export a Markdown report. The user controls where exported reports are saved or shared.",
      "Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs."
    ],
    securityTitle: "Privacy & Security",
    disclosures: [
      ["Sensitive fields redaction", "Sensitive values (e.g. passwords, bearer authorization tokens, cookies) are automatically redacted locally before any data is exported or analyzed."],
      ["No remote tracking", "Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs."],
      ["Gemini API transparency", "When using Explain with AI, only the specific JavaScript exceptions and related stack traces are sent to the Gemini API endpoint to produce an explanation. Your credentials and full logs are never transmitted."]
    ],
    urlRedactionTitle: "URL Redaction",
    urlRedactionText:
      "Bug Black Box removes URL fragments and redacts query parameter values when parameter names include sensitive terms such as password, token, secret, authorization, cookie, apiKey, or session.",
    permissionsTitle: "Permissions",
    permissionsIntro:
      "The extension uses Chrome permissions only to provide its single purpose: recording browser bug context after explicit user action.",
    contactTitle: "Contact",
    contactText:
      "Use the support contact listed in the Chrome Web Store listing for privacy questions or deletion requests. Local extension data can also be removed by clearing the extension data in Chrome or uninstalling the extension."
  },
  vi: {
    languageLabel: "Ngôn ngữ",
    english: "Tiếng Anh",
    vietnamese: "Tiếng Việt",
    chinese: "Tiếng Trung",
    useLight: "Dùng giao diện sáng",
    useDark: "Dùng giao diện tối",
    navFeatures: "Tính năng",
    navPrivacy: "Quyền riêng tư",
    navPolicy: "Chính sách",
    navReports: "Báo cáo",
    backWebsite: "Về website",
    reportMetaDescription: "Tải và xem Bug Black Box report được chia sẻ bằng shareId.",
    reportEyebrow: "Trình xem báo cáo chia sẻ",
    reportTitle: "JSON báo cáo",
    reportLead: "Nhập shareId để tải report được chia sẻ và xem JSON đã format.",
    reportShareIdLabel: "shareId",
    reportPlaceholder: "Dán shareId rồi nhấn Enter",
    reportLoading: "Đang tải...",
    reportLoad: "Tải",
    reportNoLoaded: "Chưa tải report",
    reportFetching: "Đang gọi API",
    reportJsonStatus: "JSON",
    reportReady: "Sẵn sàng",
    reportEmptyMessage: "Nhập shareId ở ô input, hoặc mở trang với ?shareId=... hoặc /reports/shareId.",
    reportEnterShareId: "Nhập shareId.",
    reportInvalidJson: "Response từ backend không phải JSON hợp lệ.",
    reportLoadFailed: "Không thể tải report.",
    reportRequestFailed: "Request thất bại với status",
    reportDocumentTitle: "Báo cáo chia sẻ",
    brandHomeLabel: "Trang chủ Bug Black Box",
    primaryNavLabel: "Điều hướng chính",
    terminalPreviewLabel: "Ví dụ xem trước bug report",
    reportScreenshotsAriaLabel: "Ảnh chụp màn hình của report",
    reportScreenshotsTitle: "Ảnh chụp màn hình",
    reportScreenshotsRendered: "{count} ảnh được hiển thị ngoài JSON",
    reportScreenshotAlt: "Ảnh chụp {index}",
    reportScreenshotCaptured: "đã chụp",
    reportScreenshotTab: "tab {tabId}",
    reportScreenshotPrimaryReason: "ảnh chính",
    reportPrimaryScreenshotTitle: "Ảnh chụp chính",
    reportJsonPreviewStatus: "Xem trước JSON",
    reportJsonPreviewNote: "Bản xem trước bỏ các trường base64 lớn và rút gọn mảng/chuỗi dài để report dễ xem.",
    reportJsonOmittedFields: "Trường nặng đã bỏ: {count}.",
    reportJsonTruncatedArrays: "Mảng đã rút gọn: {count}.",
    reportJsonOmittedEvents: "Event đã bỏ: {count}.",
    reportDownloadJson: "Tải JSON",
    reportPreviewPayloadNote: "Các trường lớn đã được lược bỏ để trình duyệt render mượt. Dùng export từ extension hoặc backend API để xem payload đầy đủ.",
    reportPreviewTruncatedAt: "[bản xem trước bị cắt ở {size}]",
    reportPreviewOmittedReplayEvents: "[đã bỏ {count} replay events]",
    reportPreviewMoreEventsOmitted: "đã bỏ thêm {count} events",
    reportPreviewRenderedImage: "[đã render thành ảnh phía trên, {size}]",
    reportPreviewOmittedKey: "[đã bỏ {key}, {size}]",
    reportPreviewTruncatedString: "[chuỗi {size} đã rút gọn]",
    reportPreviewCircular: "[tham chiếu vòng]",
    reportPreviewMoreItemsOmitted: "đã bỏ thêm {count} items",
    reportPreviewMoreKeysOmitted: "đã bỏ thêm {count} keys",
    indexTitle: "Bug Black Box",
    indexDescription:
      "Ghi console log, lỗi JavaScript, network request và thao tác người dùng thành bug report có cấu trúc.",
    eyebrow: "Chrome extension cho web bug report",
    lead:
      "Ghi console log, lỗi JavaScript, network request và chuỗi thao tác người dùng thành bug report có cấu trúc.",
    addChrome: "Thêm vào Chrome",
    privacyPolicy: "Chính sách riêng tư",
    terminal: `# Bug Report
Chế độ: Tất cả tab
Tab đã ghi: 3

## Các bước tái hiện
1. Click "Checkout"
2. Submit "payment-form"

## Lỗi JavaScript
TypeError: Cannot read properties of undefined

## Lỗi Network
POST /api/orders status 500

## Session Replay
Đã ghi sự kiện replay để phát lại cục bộ.`,
    featuresTitle: "Extension ghi lại gì",
    features: [
      ["Bằng chứng trình duyệt", "Console logs, console errors, lỗi JavaScript, request thất bại và screenshot từ tab gốc được ghi."],
      ["Thao tác người dùng", "Metadata click và submit được ghi thành bước tái hiện mà không lưu giá trị người dùng đã nhập."],
      ["Session replay", "Dữ liệu rrweb được ghi cục bộ và phát lại trong replay viewer của extension."],
      ["Chế độ nhiều tab", "Ghi một tab hoặc thu thập sự kiện từ nhiều tab có thể ghi trong cùng một phiên."],
      ["Xuất Markdown", "Tải report Markdown có kèm JSON thô để chuyển cho developer."],
      ["AI Explain", "Tùy chọn gửi ngữ cảnh report đã chọn tới Gemini sau khi bạn lưu API key riêng và bấm Explain with AI."]
    ],
    privacyTitle: "Quyền riêng tư bằng ghi có chủ đích",
    privacyLead:
      "Bug Black Box là flight recorder cho ứng dụng web dành cho developer. Công cụ theo dõi tham số front-end theo thời gian thực, giúp QA và developer capture, trace và giải thích bug mà không phải tự gom bước tái hiện.",
    facts: [
      ["Lưu cục bộ", "Reports, replay events, screenshots và Gemini API key tùy chọn được lưu bằng chrome.storage.local."],
      ["Che dữ liệu nhập", "Giá trị nhạy cảm như mật khẩu, bearer token, cookie được redacted cục bộ trước khi export hoặc phân tích."],
      ["Không backend", "Bug Black Box chạy 100% cục bộ. Chúng tôi không host tracking server, không gửi analytics và không truyền session logs của bạn."]
    ],
    permissionTitle: "Minh bạch quyền truy cập",
    permissionLead:
      "Mọi quyền trình duyệt đều phục vụ mục đích duy nhất: ghi ngữ cảnh bug sau hành động rõ ràng từ người dùng.",
    permissions: [
      ["activeTab và tabs", "Chỉ dùng để gắn recorder và đồng bộ timeline giữa các tab bạn chọn. Chúng tôi không theo dõi hoạt động tab nền."],
      ["storage và unlimitedStorage", "Dùng để lưu trạng thái extension, replay data, reports, screenshots và Gemini API key tùy chọn trên thiết bị của bạn."],
      ["scripting", "Dùng để inject logging interface nhằm đọc console warnings, errors và chuỗi click."],
      ["webRequest", "Dùng để quan sát trạng thái request, request thất bại và timing metadata trong lúc ghi các tab bạn chọn."],
      ["Host permissions", "Chỉ dùng cho các trang bạn chọn ghi và endpoint Gemini khi dùng AI Explain."]
    ],
    footer: "Chrome Web Store URL đang chờ. Thay placeholder Add to Chrome sau khi store item được tạo.",
    policyTitle: "Chính sách riêng tư",
    policyLead: "Chính sách này mô tả dữ liệu được xử lý bởi Bug Black Box Chrome extension. Cập nhật lần cuối: July 10, 2026.",
    explicitTitle: "Recording là hành động rõ ràng",
    explicitText: "Bug Black Box chỉ ghi sau khi người dùng bấm Start Recording.",
    noBackendPhaseTitle: "Không có backend Bug Black Box",
    noBackendPhaseText: "Giai đoạn này không upload reports, screenshots hoặc replay data lên server Bug Black Box.",
    recordsTitle: "Dữ liệu extension ghi",
    recordsIntro: "Trong một phiên recording, Bug Black Box có thể thu thập ngữ cảnh trình duyệt cần thiết để tái hiện và debug lỗi web:",
    records: [
      "Page URL và title của các tab được ghi.",
      "Console logs và console errors từ trang.",
      "JavaScript error messages và stack traces.",
      "Metadata click và submit, như selector và safe visible label text.",
      "Metadata request lỗi, gồm method, URL đã sanitize, status code và browser network error text.",
      "Screenshot viewport hiển thị từ tab gốc khi dừng recording, nếu Chrome cho phép.",
      "rrweb session replay events để phát lại cục bộ trong extension replay viewer."
    ],
    avoidsTitle: "Dữ liệu extension tránh ghi",
    avoidsIntro: "Bug Black Box được thiết kế để tránh lưu các giá trị nhạy cảm không cần thiết cho bug report:",
    avoids: [
      "Giá trị input password.",
      "Text nhập vào input thông thường.",
      "Nội dung text area.",
      "Nội dung contenteditable.",
      "Cookies.",
      "Full localStorage hoặc sessionStorage dumps.",
      "Request bodies, response bodies và request cookies."
    ],
    replayTitle: "Session Replay",
    replayPolicy: [
      "Session replay được ghi bằng rrweb. Replay data có thể bao gồm DOM session data, thao tác chuột, scroll và thay đổi trang cần cho playback. rrweb input masking bật với maskAllInputs: true, và extension cũng ghi action logs mà không lưu giá trị đã nhập.",
      "Replay data được lưu cục bộ trong Chrome extension storage và phát lại bằng replay viewer đi kèm extension. Replay data không được upload lên backend Bug Black Box trong giai đoạn này."
    ],
    aiTitle: "AI Explain",
    aiPolicy: [
      "AI Explain là tùy chọn. Extension chỉ gọi Gemini khi người dùng lưu Gemini API key và bấm Explain with AI trên report.",
      "Khi dùng Explain with AI, chỉ các JavaScript exception cụ thể và stack trace liên quan được gửi tới Gemini API endpoint để tạo giải thích. Credentials và full logs không được truyền đi. Screenshots và rrweb replay events không được gửi trong request AI Explain."
    ],
    storageSharingTitle: "Lưu trữ và chia sẻ",
    storageSharing: [
      "Reports, replay events, screenshots, recording state và Gemini API key tùy chọn được lưu trong chrome.storage.local. Người dùng có thể export report Markdown và tự quyết định nơi lưu hoặc chia sẻ.",
      "Bug Black Box chạy 100% cục bộ. Chúng tôi không host tracking server, không gửi analytics và không truyền session logs của bạn."
    ],
    securityTitle: "Quyền riêng tư & bảo mật",
    disclosures: [
      ["Redaction trường nhạy cảm", "Giá trị nhạy cảm như mật khẩu, bearer authorization token, cookie được redacted cục bộ trước khi export hoặc phân tích."],
      ["Không remote tracking", "Bug Black Box chạy 100% cục bộ. Chúng tôi không host tracking server, không gửi analytics và không truyền session logs của bạn."],
      ["Minh bạch Gemini API", "Khi dùng Explain with AI, chỉ JavaScript exception cụ thể và stack trace liên quan được gửi tới Gemini API endpoint để tạo giải thích. Credentials và full logs không được truyền đi."]
    ],
    urlRedactionTitle: "URL Redaction",
    urlRedactionText:
      "Bug Black Box bỏ URL fragments và redact query parameter values khi tên parameter có từ nhạy cảm như password, token, secret, authorization, cookie, apiKey hoặc session.",
    permissionsTitle: "Permissions",
    permissionsIntro:
      "Extension dùng Chrome permissions chỉ để cung cấp mục đích duy nhất: ghi ngữ cảnh bug trình duyệt sau hành động rõ ràng từ người dùng.",
    contactTitle: "Liên hệ",
    contactText:
      "Dùng support contact trong Chrome Web Store listing cho câu hỏi về quyền riêng tư hoặc yêu cầu xóa. Dữ liệu extension cục bộ cũng có thể được xóa bằng cách clear extension data trong Chrome hoặc uninstall extension."
  }
};

COPY.zh = {
  ...COPY.en,
  languageLabel: "语言",
  english: "英语",
  vietnamese: "越南语",
  chinese: "中文",
  useLight: "使用浅色主题",
  useDark: "使用深色主题",
  navFeatures: "功能",
  navPrivacy: "隐私",
  navPolicy: "政策",
  navReports: "报告",
  backWebsite: "返回网站",
  reportMetaDescription: "通过 shareId 加载并查看共享的 Bug Black Box 报告。",
  reportEyebrow: "共享报告查看器",
  reportTitle: "报告 JSON",
  reportLead: "输入 shareId 以获取共享报告，并查看格式化后的 JSON 响应。",
  reportShareIdLabel: "shareId",
  reportPlaceholder: "粘贴 shareId 后按 Enter",
  reportLoading: "加载中...",
  reportLoad: "加载",
  reportNoLoaded: "尚未加载报告",
  reportFetching: "正在请求",
  reportJsonStatus: "JSON",
  reportReady: "就绪",
  reportEmptyMessage: "在输入框中加载 shareId，或使用 ?shareId=... 或 /reports/shareId 打开此页面。",
  reportEnterShareId: "请输入 shareId。",
  reportInvalidJson: "后端响应不是有效 JSON。",
  reportLoadFailed: "无法加载报告。",
  reportRequestFailed: "请求失败，状态码",
  reportDocumentTitle: "共享报告",
  brandHomeLabel: "Bug Black Box 首页",
  primaryNavLabel: "主导航",
  terminalPreviewLabel: "缺陷报告预览示例",
  reportScreenshotsAriaLabel: "报告截图",
  reportScreenshotsTitle: "截图",
  reportScreenshotsRendered: "{count} 张截图已在 JSON 外渲染",
  reportScreenshotAlt: "截图 {index}",
  reportScreenshotCaptured: "已捕获",
  reportScreenshotTab: "标签页 {tabId}",
  reportScreenshotPrimaryReason: "主截图",
  reportPrimaryScreenshotTitle: "主截图",
  reportJsonPreviewStatus: "JSON 预览",
  reportJsonPreviewNote: "预览会省略较大的 base64 字段，并截断较长数组/字符串，以保持报告可读。",
  reportJsonOmittedFields: "已省略大字段：{count}。",
  reportJsonTruncatedArrays: "已截断数组：{count}。",
  reportJsonOmittedEvents: "已省略事件：{count}。",
  reportDownloadJson: "下载 JSON",
  reportPreviewPayloadNote: "较大的字段已省略，以便浏览器顺畅渲染。请使用扩展导出或后端 API 查看完整 payload。",
  reportPreviewTruncatedAt: "[预览在 {size} 处截断]",
  reportPreviewOmittedReplayEvents: "[已省略 {count} 个 replay events]",
  reportPreviewMoreEventsOmitted: "已省略另外 {count} 个 events",
  reportPreviewRenderedImage: "[已在上方渲染为图片，{size}]",
  reportPreviewOmittedKey: "[已省略 {key}，{size}]",
  reportPreviewTruncatedString: "[已截断 {size} 字符串]",
  reportPreviewCircular: "[循环引用]",
  reportPreviewMoreItemsOmitted: "已省略另外 {count} 项",
  reportPreviewMoreKeysOmitted: "已省略另外 {count} 个键",
  indexDescription: "将控制台日志、JavaScript 异常、网络请求和用户操作轨迹记录为结构化缺陷报告。",
  eyebrow: "用于 Web 缺陷报告的 Chrome 扩展",
  lead: "将控制台日志、JavaScript 异常、网络请求和用户操作轨迹记录为结构化缺陷报告。",
  addChrome: "添加到 Chrome",
  privacyPolicy: "隐私政策",
  terminal: `# 缺陷报告
模式：所有标签页
已捕获标签页：3

## 复现步骤
1. 点击 "Checkout"
2. 提交 "payment-form"

## JavaScript 错误
TypeError: Cannot read properties of undefined

## 网络错误
POST /api/orders status 500

## 会话回放
已捕获可在本地播放的回放事件。`,
  featuresTitle: "捕获内容",
  features: [
    ["浏览器证据", "控制台日志、控制台错误、JavaScript 错误、失败请求，以及来自根标签页的截图。"],
    ["用户操作", "点击和提交元数据会被记录为可复现步骤，但不会保存用户输入值。"],
    ["会话回放", "rrweb 会话数据在本地捕获，并可在扩展的回放查看器中播放。"],
    ["多标签页模式", "记录单个标签页，或在同一会话中从多个可记录标签页收集事件。"],
    ["Markdown 导出", "下载 Markdown 报告，并附带原始报告 JSON，方便交给开发人员。"],
    ["AI 解释", "保存自己的 Gemini API key 后，可选择将选定报告上下文发送给 Gemini 进行解释。"]
  ],
  privacyTitle: "通过明确录制保护隐私",
  privacyLead:
    "Bug Black Box 是面向开发者的 Web 应用飞行记录器。它实时监控前端运行参数，帮助 QA 和开发人员即时捕获、追踪和解释缺陷，无需手动整理复现步骤。",
  facts: [
    ["本地存储", "报告、回放事件、截图以及可选的 Gemini API key 会通过 chrome.storage.local 存储。"],
    ["输入遮罩", "密码、Bearer token、Cookie 等敏感值会在导出或分析前于本地自动脱敏。"],
    ["无后端", "Bug Black Box 100% 在本地运行。我们不托管外部跟踪服务器，不发送分析数据，也不传输你的会话日志。"]
  ],
  permissionTitle: "权限透明",
  permissionLead: "每个浏览器权限都只用于一个目的：在用户明确操作后记录浏览器缺陷上下文。",
  permissions: [
    ["activeTab 和 tabs", "仅用于挂载记录器，并在你选择的标签页之间同步录制时间线。我们不会跟踪后台标签页活动。"],
    ["storage 和 unlimitedStorage", "用于在你的设备本地保存扩展状态、会话回放数据、报告、截图以及可选的 Gemini API key。"],
    ["scripting", "用于注入日志接口，以读取控制台警告、错误和点击序列。"],
    ["webRequest", "用于在录制你选择的标签页时观察请求状态、失败请求和 timing 元数据。"],
    ["Host permissions", "仅用于你选择录制的页面，以及使用 AI Explain 时访问 Gemini endpoint。"]
  ],
  footer: "Chrome Web Store URL 待定。商店条目创建后请替换 Add to Chrome 占位链接。",
  policyTitle: "隐私政策",
  policyLead: "本政策说明 Bug Black Box Chrome 扩展处理的数据。最后更新：2026 年 7 月 10 日。",
  explicitTitle: "录制需要明确操作",
  explicitText: "Bug Black Box 只有在用户点击 Start Recording 后才会开始记录。",
  noBackendPhaseTitle: "没有 Bug Black Box 后端",
  noBackendPhaseText: "当前阶段不会将报告、截图或回放数据上传到 Bug Black Box 服务器。",
  recordsTitle: "扩展记录的数据",
  recordsIntro: "在活跃录制会话中，Bug Black Box 可能收集用于复现和调试 Web 问题所需的浏览器上下文：",
  records: [
    "被录制标签页的页面 URL 和标题。",
    "页面输出的控制台日志和控制台错误。",
    "JavaScript 错误消息和堆栈跟踪。",
    "用户点击和提交元数据，例如 selector 和安全的可见标签文本。",
    "失败网络请求元数据，包括 method、已清理 URL、状态码和浏览器网络错误文本。",
    "录制停止时根标签页可见视口的截图，前提是 Chrome 允许捕获。",
    "用于在扩展回放查看器中本地播放的 rrweb 会话回放事件。"
  ],
  avoidsTitle: "扩展避免记录的数据",
  avoidsIntro: "Bug Black Box 的设计目标是避免有意保存缺陷报告不需要的敏感值：",
  avoids: [
    "密码输入值。",
    "普通输入框中键入的文本。",
    "textarea 内容。",
    "contenteditable 内容。",
    "Cookie。",
    "完整 localStorage 或 sessionStorage dump。",
    "请求 body、响应 body 和请求 cookie。"
  ],
  replayTitle: "会话回放",
  replayPolicy: [
    "会话回放通过 rrweb 记录。回放数据可能包含 DOM 会话数据、鼠标交互、滚动活动和页面变化，以支持播放。rrweb 已启用 maskAllInputs: true，扩展也会记录不含输入值的操作日志。",
    "回放数据存储在 Chrome 扩展本地存储中，并由扩展内置的本地回放查看器播放。当前阶段回放数据不会上传到 Bug Black Box 后端。"
  ],
  aiTitle: "AI Explain",
  aiPolicy: [
    "AI Explain 是可选功能。只有当用户保存 Gemini API key 并在报告中点击 Explain with AI 时，扩展才会调用 Gemini。",
    "使用 Explain with AI 时，只会将具体的 JavaScript 异常和相关堆栈跟踪发送到 Gemini API endpoint 以生成解释。你的凭据和完整日志不会被传输。截图和 rrweb 回放事件不会包含在 AI Explain 请求中。"
  ],
  storageSharingTitle: "存储与共享",
  storageSharing: [
    "报告、回放事件、截图、录制状态以及可选的 Gemini API key 会存储在 chrome.storage.local 中。用户可以导出 Markdown 报告，并自行决定保存或分享位置。",
    "Bug Black Box 100% 在本地运行。我们不托管外部跟踪服务器，不发送分析数据，也不传输你的会话日志。"
  ],
  securityTitle: "隐私与安全",
  disclosures: [
    ["敏感字段脱敏", "密码、Bearer authorization token、Cookie 等敏感值会在导出或分析前于本地自动脱敏。"],
    ["无远程跟踪", "Bug Black Box 100% 在本地运行。我们不托管外部跟踪服务器，不发送分析数据，也不传输你的会话日志。"],
    ["Gemini API 透明性", "使用 Explain with AI 时，只会将具体 JavaScript 异常和相关堆栈跟踪发送到 Gemini API endpoint 以生成解释。凭据和完整日志不会被传输。"]
  ],
  urlRedactionTitle: "URL 脱敏",
  urlRedactionText:
    "当 query 参数名包含 password、token、secret、authorization、cookie、apiKey 或 session 等敏感词时，Bug Black Box 会移除 URL fragment 并脱敏 query 参数值。",
  permissionsTitle: "权限",
  permissionsIntro: "扩展使用 Chrome 权限只为一个目的：在用户明确操作后记录浏览器缺陷上下文。",
  contactTitle: "联系",
  contactText:
    "如有隐私问题或删除请求，请使用 Chrome Web Store listing 中列出的支持联系方式。本地扩展数据也可以通过清除 Chrome 扩展数据或卸载扩展来删除。"
};

export function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("vi")) return "vi";
  if (value.startsWith("zh") || value.startsWith("cn")) return "zh";
  return "en";
}
