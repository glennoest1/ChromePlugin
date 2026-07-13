const WEB_LANGUAGE_KEY = "bbbWebLanguage";

const WEB_COPY = {
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
    backWebsite: "Back to Website",
    indexTitle: "Bug Black Box",
    indexDescription: "Record console logs, JavaScript exceptions, network requests, and user action trails into structured bug reports.",
    eyebrow: "Chrome extension for web bug reports",
    lead: "Record console logs, JavaScript exceptions, network requests, and user action trails into structured bug reports.",
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
    feature1Title: "Browser evidence",
    feature1Text: "Console logs, console errors, JavaScript errors, failed requests, and a screenshot from the recorded root tab.",
    feature2Title: "User actions",
    feature2Text: "Click and submit metadata are recorded as reproducible steps without storing typed input values.",
    feature3Title: "Session replay",
    feature3Text: "rrweb session data is captured locally and played back in the extension replay viewer.",
    feature4Title: "Multi-tab mode",
    feature4Text: "Record one tab or collect events from multiple recordable tabs in the same session.",
    feature5Title: "Markdown export",
    feature5Text: "Download a Markdown report with the raw report JSON included for developer handoff.",
    feature6Title: "AI Explain",
    feature6Text: "Optionally send selected report context to Gemini after you save your own API key and click Explain with AI.",
    privacyTitle: "Privacy by Explicit Recording",
    privacyLead: "Bug Black Box is a developer-focused flight recorder for web applications. It monitors front-end execution parameters in real-time, helping QA engineers and software developers capture, trace, and explain bugs instantly without manually compiling reproduction steps.",
    localStorage: "Local storage",
    localStorageText: "Reports, replay events, screenshots, and the optional Gemini API key are stored with chrome.storage.local.",
    maskedInputs: "Masked inputs",
    maskedInputsText: "Sensitive values (e.g. passwords, bearer authorization tokens, cookies) are automatically redacted locally before any data is exported or analyzed.",
    noBackend: "No backend",
    noBackendText: "Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs.",
    permissionTitle: "Permission Transparency",
    permissionLead: "Every browser permission supports the single purpose of recording browser bug context after explicit user action.",
    activeTabs: "activeTab and tabs",
    activeTabsText: "Used exclusively to attach the recorder and sync recording timelines across the tab(s) you select. We do not track background tab activities.",
    storagePerm: "storage and unlimitedStorage",
    storagePermText: "Used to save your local extension state, session replay data, reports, screenshots, and optional Gemini API key locally on your device.",
    scriptingPerm: "scripting",
    scriptingPermText: "Used to inject the logging interface to read console warnings, errors, and click sequences.",
    webRequestPerm: "webRequest",
    webRequestPermText: "Used to observe request status, failed requests, and timing metadata while recording the tabs you choose.",
    hostPerm: "Host permissions",
    hostPermText: "Used only for pages you choose to record and for the Gemini endpoint when AI Explain is used.",
    footer: "Chrome Web Store URL pending. Replace the Add to Chrome placeholder after the store item is created.",
    policyTitle: "Privacy Policy",
    policyLead: "This policy describes the data handled by the Bug Black Box Chrome extension. Last updated: July 10, 2026.",
    explicitTitle: "Recording is explicit",
    explicitText: "Bug Black Box records only after the user clicks Start Recording.",
    noBackendPhaseTitle: "No Bug Black Box backend",
    noBackendPhaseText: "This phase does not upload reports, screenshots, or replay data to a Bug Black Box server.",
    dataRecordsTitle: "Data the Extension Records",
    dataRecordsIntro: "During an active recording session, Bug Black Box may collect browser context needed to reproduce and debug a web issue:",
    dataAvoidsTitle: "Data the Extension Avoids Recording",
    dataAvoidsIntro: "Bug Black Box is designed to avoid intentionally storing sensitive values that are not needed for bug reports:",
    replayTitle: "Session Replay",
    replayPolicy1: "Session replay is recorded through rrweb. Replay data can include DOM session data, mouse interactions, scroll activity, and page changes needed for playback. rrweb input masking is enabled with maskAllInputs: true, and the extension also records action logs without typed input values.",
    replayPolicy2: "Replay data is stored locally in Chrome extension storage and is played back by the local replay viewer bundled with the extension. Replay data is not uploaded to a Bug Black Box backend in this phase.",
    aiTitle: "AI Explain",
    aiPolicy1: "AI Explain is optional. The extension calls Gemini only when the user saves a Gemini API key and clicks Explain with AI on a report.",
    aiPolicy2: "When using Explain with AI, only the specific JavaScript exceptions and related stack traces are sent to the Gemini API endpoint to produce an explanation. Your credentials and full logs are never transmitted. Screenshots and rrweb replay events are not sent by the AI Explain request.",
    storageSharingTitle: "Storage and Sharing",
    storageSharing1: "Reports, replay events, screenshots, recording state, and the optional Gemini API key are stored in chrome.storage.local. The user can export a Markdown report. The user controls where exported reports are saved or shared.",
    storageSharing2: "Bug Black Box runs 100% locally. We do not host external tracking servers, send analytics, or transmit your session logs.",
    securityTitle: "Privacy & Security",
    redactionTitle: "Sensitive fields redaction",
    redactionText: "Sensitive values (e.g. passwords, bearer authorization tokens, cookies) are automatically redacted locally before any data is exported or analyzed.",
    noTrackingTitle: "No remote tracking",
    geminiTitle: "Gemini API transparency",
    geminiText: "When using Explain with AI, only the specific JavaScript exceptions and related stack traces are sent to the Gemini API endpoint to produce an explanation. Your credentials and full logs are never transmitted.",
    urlRedactionTitle: "URL Redaction",
    urlRedactionText: "Bug Black Box removes URL fragments and redacts query parameter values when parameter names include sensitive terms such as password, token, secret, authorization, cookie, apiKey, or session.",
    permissionsTitle: "Permissions",
    permissionsIntro: "The extension uses Chrome permissions only to provide its single purpose: recording browser bug context after explicit user action.",
    contactTitle: "Contact",
    contactText: "Use the support contact listed in the Chrome Web Store listing for privacy questions or deletion requests. Local extension data can also be removed by clearing the extension data in Chrome or uninstalling the extension.",
    records: [
      "Page URL and title for recorded tabs.",
      "Console logs and console errors emitted by the page.",
      "JavaScript error messages and stack traces.",
      "User click and submit metadata, such as a selector and safe visible label text.",
      "Failed network request metadata, including method, sanitized URL, status code, and browser network error text.",
      "A screenshot of the visible viewport from the root tab when recording stops, when Chrome allows capture.",
      "rrweb session replay events for local playback in the extension replay viewer."
    ],
    avoids: [
      "Password input values.",
      "Text typed into normal input fields.",
      "Text area content.",
      "contenteditable content.",
      "Cookies.",
      "Full localStorage or sessionStorage dumps.",
      "Request bodies, response bodies, and request cookies."
    ]
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
    backWebsite: "Về trang giới thiệu",
    indexTitle: "Bug Black Box",
    indexDescription: "Ghi console log, lỗi JavaScript, network request và thao tác người dùng thành bug report có cấu trúc.",
    eyebrow: "Chrome extension cho web bug report",
    lead: "Ghi console log, lỗi JavaScript, network request và chuỗi thao tác người dùng thành bug report có cấu trúc.",
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
    feature1Title: "Bằng chứng trình duyệt",
    feature1Text: "Console logs, console errors, lỗi JavaScript, request thất bại và screenshot từ tab gốc được ghi.",
    feature2Title: "Thao tác người dùng",
    feature2Text: "Metadata click và submit được ghi thành bước tái hiện mà không lưu giá trị người dùng đã nhập.",
    feature3Title: "Session replay",
    feature3Text: "Dữ liệu rrweb được ghi cục bộ và phát lại trong replay viewer của extension.",
    feature4Title: "Chế độ nhiều tab",
    feature4Text: "Ghi một tab hoặc thu thập sự kiện từ nhiều tab có thể ghi trong cùng một phiên.",
    feature5Title: "Xuất Markdown",
    feature5Text: "Tải report Markdown có kèm JSON thô để chuyển cho developer.",
    feature6Title: "AI Explain",
    feature6Text: "Tùy chọn gửi ngữ cảnh report đã chọn tới Gemini sau khi bạn lưu API key riêng và bấm Explain with AI.",
    privacyTitle: "Quyền riêng tư bằng ghi có chủ đích",
    privacyLead: "Bug Black Box là flight recorder cho ứng dụng web dành cho developer. Công cụ theo dõi tham số front-end theo thời gian thực, giúp QA và developer capture, trace và giải thích bug mà không phải tự gom bước tái hiện.",
    localStorage: "Lưu cục bộ",
    localStorageText: "Reports, replay events, screenshots và Gemini API key tùy chọn được lưu bằng chrome.storage.local.",
    maskedInputs: "Che dữ liệu nhập",
    maskedInputsText: "Giá trị nhạy cảm như mật khẩu, bearer token, cookie được redacted cục bộ trước khi export hoặc phân tích.",
    noBackend: "Không backend",
    noBackendText: "Bug Black Box chạy 100% cục bộ. Chúng tôi không host tracking server, không gửi analytics và không truyền session logs của bạn.",
    permissionTitle: "Minh bạch quyền truy cập",
    permissionLead: "Mọi quyền trình duyệt đều phục vụ mục đích duy nhất: ghi ngữ cảnh bug sau hành động rõ ràng từ người dùng.",
    activeTabs: "activeTab và tabs",
    activeTabsText: "Chỉ dùng để gắn recorder và đồng bộ timeline giữa các tab bạn chọn. Chúng tôi không theo dõi hoạt động tab nền.",
    storagePerm: "storage và unlimitedStorage",
    storagePermText: "Dùng để lưu trạng thái extension, replay data, reports, screenshots và Gemini API key tùy chọn trên thiết bị của bạn.",
    scriptingPerm: "scripting",
    scriptingPermText: "Dùng để inject logging interface nhằm đọc console warnings, errors và chuỗi click.",
    webRequestPerm: "webRequest",
    webRequestPermText: "Dùng để quan sát trạng thái request, request thất bại và timing metadata trong lúc ghi các tab bạn chọn.",
    hostPerm: "Host permissions",
    hostPermText: "Chỉ dùng cho các trang bạn chọn ghi và endpoint Gemini khi dùng AI Explain.",
    footer: "Chrome Web Store URL đang chờ. Thay placeholder Add to Chrome sau khi store item được tạo.",
    policyTitle: "Chính sách riêng tư",
    policyLead: "Chính sách này mô tả dữ liệu được xử lý bởi Bug Black Box Chrome extension. Cập nhật lần cuối: July 10, 2026.",
    explicitTitle: "Recording là hành động rõ ràng",
    explicitText: "Bug Black Box chỉ ghi sau khi người dùng bấm Start Recording.",
    noBackendPhaseTitle: "Không có backend Bug Black Box",
    noBackendPhaseText: "Giai đoạn này không upload reports, screenshots hoặc replay data lên server Bug Black Box.",
    dataRecordsTitle: "Dữ liệu extension ghi",
    dataRecordsIntro: "Trong một phiên recording, Bug Black Box có thể thu thập ngữ cảnh trình duyệt cần thiết để tái hiện và debug lỗi web:",
    dataAvoidsTitle: "Dữ liệu extension tránh ghi",
    dataAvoidsIntro: "Bug Black Box được thiết kế để tránh lưu các giá trị nhạy cảm không cần thiết cho bug report:",
    replayTitle: "Session Replay",
    replayPolicy1: "Session replay được ghi bằng rrweb. Replay data có thể bao gồm DOM session data, thao tác chuột, scroll và thay đổi trang cần cho playback. rrweb input masking bật với maskAllInputs: true, và extension cũng ghi action logs mà không lưu giá trị đã nhập.",
    replayPolicy2: "Replay data được lưu cục bộ trong Chrome extension storage và phát lại bằng replay viewer đi kèm extension. Replay data không được upload lên backend Bug Black Box trong giai đoạn này.",
    aiTitle: "AI Explain",
    aiPolicy1: "AI Explain là tùy chọn. Extension chỉ gọi Gemini khi người dùng lưu Gemini API key và bấm Explain with AI trên report.",
    aiPolicy2: "Khi dùng Explain with AI, chỉ các JavaScript exception cụ thể và stack trace liên quan được gửi tới Gemini API endpoint để tạo giải thích. Credentials và full logs không được truyền đi. Screenshots và rrweb replay events không được gửi trong request AI Explain.",
    storageSharingTitle: "Lưu trữ và chia sẻ",
    storageSharing1: "Reports, replay events, screenshots, recording state và Gemini API key tùy chọn được lưu trong chrome.storage.local. Người dùng có thể export report Markdown và tự quyết định nơi lưu hoặc chia sẻ.",
    storageSharing2: "Bug Black Box chạy 100% cục bộ. Chúng tôi không host tracking server, không gửi analytics và không truyền session logs của bạn.",
    securityTitle: "Quyền riêng tư & bảo mật",
    redactionTitle: "Redaction trường nhạy cảm",
    redactionText: "Giá trị nhạy cảm như mật khẩu, bearer authorization token, cookie được redacted cục bộ trước khi export hoặc phân tích.",
    noTrackingTitle: "Không remote tracking",
    geminiTitle: "Minh bạch Gemini API",
    geminiText: "Khi dùng Explain with AI, chỉ JavaScript exception cụ thể và stack trace liên quan được gửi tới Gemini API endpoint để tạo giải thích. Credentials và full logs không được truyền đi.",
    urlRedactionTitle: "URL Redaction",
    urlRedactionText: "Bug Black Box bỏ URL fragments và redact query parameter values khi tên parameter có từ nhạy cảm như password, token, secret, authorization, cookie, apiKey hoặc session.",
    permissionsTitle: "Permissions",
    permissionsIntro: "Extension dùng Chrome permissions chỉ để cung cấp mục đích duy nhất: ghi ngữ cảnh bug trình duyệt sau hành động rõ ràng từ người dùng.",
    contactTitle: "Liên hệ",
    contactText: "Dùng support contact trong Chrome Web Store listing cho câu hỏi về quyền riêng tư hoặc yêu cầu xóa. Dữ liệu extension cục bộ cũng có thể được xóa bằng cách clear extension data trong Chrome hoặc uninstall extension.",
    records: [
      "Page URL và title của các tab được ghi.",
      "Console logs và console errors từ trang.",
      "JavaScript error messages và stack traces.",
      "Metadata click và submit, như selector và safe visible label text.",
      "Metadata request lỗi, gồm method, URL đã sanitize, status code và browser network error text.",
      "Screenshot viewport hiển thị từ tab gốc khi dừng recording, nếu Chrome cho phép.",
      "rrweb session replay events để phát lại cục bộ trong extension replay viewer."
    ],
    avoids: [
      "Giá trị input password.",
      "Text nhập vào input thông thường.",
      "Nội dung text area.",
      "Nội dung contenteditable.",
      "Cookies.",
      "Full localStorage hoặc sessionStorage dumps.",
      "Request bodies, response bodies và request cookies."
    ]
  },
  zh: {
    languageLabel: "语言",
    english: "英语",
    vietnamese: "越南语",
    chinese: "中文",
    useLight: "使用浅色主题",
    useDark: "使用深色主题",
    navFeatures: "功能",
    navPrivacy: "隐私",
    navPolicy: "政策",
    backWebsite: "返回网站",
    indexTitle: "Bug Black Box",
    indexDescription: "将控制台日志、JavaScript 异常、网络请求和用户操作路径记录为结构化缺陷报告。",
    eyebrow: "用于网页缺陷报告的 Chrome 扩展",
    lead: "将控制台日志、JavaScript 异常、网络请求和用户操作路径记录为结构化缺陷报告。",
    addChrome: "添加到 Chrome",
    privacyPolicy: "隐私政策",
    terminal: `# Bug Report
模式：所有标签页
捕获标签页：3

## 复现步骤
1. 点击 "Checkout"
2. 提交 "payment-form"

## JavaScript 错误
TypeError: Cannot read properties of undefined

## 网络错误
POST /api/orders status 500

## 会话回放
已捕获用于本地播放的回放事件。`,
    featuresTitle: "捕获内容",
    feature1Title: "浏览器证据",
    feature1Text: "控制台日志、控制台错误、JavaScript 错误、失败请求，以及录制根标签页的截图。",
    feature2Title: "用户操作",
    feature2Text: "点击和提交的元数据会被记录为可复现步骤，但不会存储输入值。",
    feature3Title: "会话回放",
    feature3Text: "rrweb 会话数据会在本地捕获，并在扩展的回放查看器中播放。",
    feature4Title: "多标签模式",
    feature4Text: "可以录制一个标签页，也可以在同一会话中收集多个可录制标签页的事件。",
    feature5Title: "Markdown 导出",
    feature5Text: "下载包含原始 JSON 的 Markdown 报告，便于交给开发人员。",
    feature6Title: "AI Explain",
    feature6Text: "保存自己的 API key 后，可选择将报告上下文发送给 Gemini 并点击 Explain with AI。",
    privacyTitle: "明确录制，保护隐私",
    privacyLead: "Bug Black Box 是面向开发者的网页应用 flight recorder。它实时监控前端执行参数，帮助 QA 和开发人员快速捕获、追踪并解释缺陷，无需手动整理复现步骤。",
    localStorage: "本地存储",
    localStorageText: "报告、回放事件、截图和可选的 Gemini API key 都存储在 chrome.storage.local 中。",
    maskedInputs: "输入遮蔽",
    maskedInputsText: "敏感值（如密码、bearer token、cookie）会在本地自动脱敏，然后才会导出或分析。",
    noBackend: "无后端",
    noBackendText: "Bug Black Box 100% 本地运行。我们不托管外部跟踪服务器，不发送分析数据，也不传输你的会话日志。",
    permissionTitle: "权限透明",
    permissionLead: "每个浏览器权限都只服务于一个目的：在用户明确操作后记录浏览器缺陷上下文。",
    activeTabs: "activeTab 和 tabs",
    activeTabsText: "仅用于挂载 recorder，并在你选择的标签页之间同步录制时间线。我们不跟踪后台标签页活动。",
    storagePerm: "storage 和 unlimitedStorage",
    storagePermText: "用于在你的设备上保存本地扩展状态、会话回放数据、报告、截图和可选的 Gemini API key。",
    scriptingPerm: "scripting",
    scriptingPermText: "用于注入日志接口，以读取 console warnings、errors 和点击序列。",
    webRequestPerm: "webRequest",
    webRequestPermText: "用于在录制所选标签页时观察请求状态、失败请求和时间元数据。",
    hostPerm: "Host permissions",
    hostPermText: "仅用于你选择录制的页面，以及使用 AI Explain 时的 Gemini endpoint。",
    footer: "Chrome Web Store URL 待定。创建商店条目后，请替换 Add to Chrome 占位链接。",
    policyTitle: "隐私政策",
    policyLead: "本政策说明 Bug Black Box Chrome 扩展处理的数据。最后更新：2026 年 7 月 10 日。",
    explicitTitle: "录制是明确触发的",
    explicitText: "只有在用户点击 Start Recording 后，Bug Black Box 才会开始录制。",
    noBackendPhaseTitle: "没有 Bug Black Box 后端",
    noBackendPhaseText: "当前阶段不会将报告、截图或回放数据上传到 Bug Black Box 服务器。",
    dataRecordsTitle: "扩展记录的数据",
    dataRecordsIntro: "在录制会话中，Bug Black Box 可能收集用于复现和调试网页问题的浏览器上下文：",
    dataAvoidsTitle: "扩展避免记录的数据",
    dataAvoidsIntro: "Bug Black Box 设计上会避免有意存储缺陷报告不需要的敏感值：",
    replayTitle: "会话回放",
    replayPolicy1: "会话回放通过 rrweb 记录。回放数据可能包含 DOM 会话数据、鼠标交互、滚动活动和页面变化。rrweb 输入遮蔽启用了 maskAllInputs: true，扩展的操作日志也不会记录输入值。",
    replayPolicy2: "回放数据存储在 Chrome 扩展本地存储中，并由扩展内置的本地回放查看器播放。当前阶段不会上传到 Bug Black Box 后端。",
    aiTitle: "AI Explain",
    aiPolicy1: "AI Explain 是可选功能。只有当用户保存 Gemini API key 并在报告中点击 Explain with AI 时，扩展才会调用 Gemini。",
    aiPolicy2: "使用 Explain with AI 时，只会将特定 JavaScript 异常和相关 stack trace 发送到 Gemini API endpoint 以生成解释。你的凭据和完整日志不会被传输。截图和 rrweb 回放事件不会随 AI Explain 请求发送。",
    storageSharingTitle: "存储与共享",
    storageSharing1: "报告、回放事件、截图、录制状态和可选的 Gemini API key 存储在 chrome.storage.local 中。用户可以导出 Markdown 报告，并自行决定保存或分享位置。",
    storageSharing2: "Bug Black Box 100% 本地运行。我们不托管外部跟踪服务器，不发送分析数据，也不传输你的会话日志。",
    securityTitle: "隐私与安全",
    redactionTitle: "敏感字段脱敏",
    redactionText: "敏感值（如密码、bearer authorization token、cookie）会在本地自动脱敏，然后才会导出或分析。",
    noTrackingTitle: "无远程跟踪",
    geminiTitle: "Gemini API 透明度",
    geminiText: "使用 Explain with AI 时，只会将特定 JavaScript 异常和相关 stack trace 发送到 Gemini API endpoint 以生成解释。你的凭据和完整日志不会被传输。",
    urlRedactionTitle: "URL 脱敏",
    urlRedactionText: "Bug Black Box 会移除 URL fragments，并在参数名包含 password、token、secret、authorization、cookie、apiKey 或 session 等敏感词时脱敏 query parameter values。",
    permissionsTitle: "权限",
    permissionsIntro: "扩展仅使用 Chrome 权限来提供唯一目的：在用户明确操作后记录浏览器缺陷上下文。",
    contactTitle: "联系",
    contactText: "如有隐私问题或删除请求，请使用 Chrome Web Store listing 中列出的支持联系方式。也可以通过清除 Chrome 中的扩展数据或卸载扩展来删除本地扩展数据。",
    records: [
      "已录制标签页的页面 URL 和标题。",
      "页面产生的控制台日志和控制台错误。",
      "JavaScript 错误消息和 stack traces。",
      "用户点击和提交元数据，例如 selector 和安全的可见标签文本。",
      "失败网络请求元数据，包括 method、已清理 URL、status code 和浏览器网络错误文本。",
      "录制停止时根标签页可见 viewport 的截图（若 Chrome 允许）。",
      "用于在扩展回放查看器中本地播放的 rrweb 会话回放事件。"
    ],
    avoids: [
      "密码输入值。",
      "普通输入框中键入的文本。",
      "Text area 内容。",
      "contenteditable 内容。",
      "Cookies。",
      "完整 localStorage 或 sessionStorage dumps。",
      "Request bodies、response bodies 和 request cookies。"
    ]
  }
};

let webLanguage = "en";

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("vi")) return "vi";
  if (value.startsWith("zh") || value.startsWith("cn")) return "zh";
  return "en";
}

function t(key) {
  return WEB_COPY[webLanguage][key] ?? WEB_COPY.en[key] ?? key;
}

function html(strings, ...values) {
  return strings.reduce((out, part, index) => out + part + (values[index] ?? ""), "");
}

function initWebI18n() {
  webLanguage = normalizeLanguage(localStorage.getItem(WEB_LANGUAGE_KEY) || navigator.language);
  document.documentElement.lang = webLanguage === "zh" ? "zh-CN" : webLanguage;
  renderHeader();
  if (document.body.classList.contains("privacy-page")) {
    renderPrivacyPage();
  } else {
    renderIndexPage();
  }
  updateThemeLabel();
}

function renderHeader() {
  const nav = document.querySelector("nav[aria-label='Primary navigation']");
  if (nav) {
    nav.innerHTML = `
      <a href="#features">${t("navFeatures")}</a>
      <a href="#privacy">${t("navPrivacy")}</a>
      <a href="./privacy.html">${t("navPolicy")}</a>
    `;
  }

  const backLink = document.querySelector(".privacy-page .nav-actions > a");
  if (backLink) backLink.textContent = t("backWebsite");

  const actions = document.querySelector(".nav-actions");
  const existingControl = document.getElementById("webLanguageSelect")?.closest(".language-control");
  if (existingControl) existingControl.remove();
  if (actions) {
    const control = document.createElement("label");
    control.className = "language-control";
    control.innerHTML = `
      <select id="webLanguageSelect">
        <option value="en"${webLanguage === "en" ? " selected" : ""}>${t("english")}</option>
        <option value="vi"${webLanguage === "vi" ? " selected" : ""}>${t("vietnamese")}</option>
        <option value="zh"${webLanguage === "zh" ? " selected" : ""}>${t("chinese")}</option>
      </select>
    `;
    actions.insertBefore(control, actions.querySelector("[data-theme-toggle]"));
    control.querySelector("select").addEventListener("change", (event) => {
      localStorage.setItem(WEB_LANGUAGE_KEY, event.target.value);
      initWebI18n();
    });
  }
}

function renderIndexPage() {
  document.title = t("indexTitle");
  document.querySelector("meta[name='description']")?.setAttribute("content", t("indexDescription"));
  document.querySelector("main").innerHTML = html`
    <section class="hero">
      <div>
        <p class="eyebrow">${t("eyebrow")}</p>
        <h1>Bug Black Box</h1>
        <p class="lead">${t("lead")}</p>
        <div class="actions">
          <a class="btn btn-primary" href="#" aria-label="${t("addChrome")}">${t("addChrome")}</a>
          <a class="btn" href="./privacy.html">${t("privacyPolicy")}</a>
        </div>
      </div>
      <div class="terminal" aria-label="Example bug report preview">
        <div class="terminal-head">
          <span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
          <span>bug-report.md</span>
        </div>
        <pre class="report">${t("terminal")}</pre>
      </div>
    </section>
    <section id="features" class="band">
      <div class="inner">
        <h2>${t("featuresTitle")}</h2>
        <div class="grid">
          ${[1, 2, 3, 4, 5, 6].map((index) => `
            <article class="card">
              <h3>${t(`feature${index}Title`)}</h3>
              <p>${t(`feature${index}Text`)}</p>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
    <section id="privacy" class="band">
      <div class="inner split">
        <div>
          <h2>${t("privacyTitle")}</h2>
          <p class="lead">${t("privacyLead")}</p>
        </div>
        <dl class="facts">
          ${fact(t("localStorage"), t("localStorageText"))}
          ${fact(t("maskedInputs"), t("maskedInputsText"))}
          ${fact(t("noBackend"), t("noBackendText"))}
        </dl>
      </div>
    </section>
    <section class="band">
      <div class="inner split">
        <div>
          <h2>${t("permissionTitle")}</h2>
          <p class="lead">${t("permissionLead")}</p>
        </div>
        <div class="permissions">
          ${permission(t("activeTabs"), t("activeTabsText"))}
          ${permission(t("storagePerm"), t("storagePermText"))}
          ${permission(t("scriptingPerm"), t("scriptingPermText"))}
          ${permission(t("webRequestPerm"), t("webRequestPermText"))}
          ${permission(t("hostPerm"), t("hostPermText"))}
        </div>
      </div>
    </section>
  `;
  document.querySelector("footer").textContent = t("footer");
}

function renderPrivacyPage() {
  document.title = `${t("policyTitle")} - Bug Black Box`;
  document.querySelector("meta[name='description']")?.setAttribute("content", t("policyLead"));
  document.querySelector("main").innerHTML = html`
    <h1>${t("policyTitle")}</h1>
    <p class="lead">${t("policyLead")}</p>
    <div class="summary">
      <div class="item"><strong>${t("explicitTitle")}</strong><p>${t("explicitText")}</p></div>
      <div class="item"><strong>${t("noBackendPhaseTitle")}</strong><p>${t("noBackendPhaseText")}</p></div>
    </div>
    ${section(t("dataRecordsTitle"), `<p>${t("dataRecordsIntro")}</p>${list(WEB_COPY[webLanguage].records)}`)}
    ${section(t("dataAvoidsTitle"), `<p>${t("dataAvoidsIntro")}</p>${list(WEB_COPY[webLanguage].avoids)}`)}
    ${section(t("replayTitle"), `<p>${t("replayPolicy1")}</p><p>${t("replayPolicy2")}</p>`)}
    ${section(t("aiTitle"), `<p>${t("aiPolicy1")}</p><p>${t("aiPolicy2")}</p>`)}
    ${section(t("storageSharingTitle"), `<p>${t("storageSharing1")}</p><p>${t("storageSharing2")}</p>`)}
    <h2>${t("securityTitle")}</h2>
    <ul class="disclosure">
      ${disclosure(t("redactionTitle"), t("redactionText"))}
      ${disclosure(t("noTrackingTitle"), t("noBackendText"))}
      ${disclosure(t("geminiTitle"), t("geminiText"))}
    </ul>
    ${section(t("urlRedactionTitle"), `<p>${t("urlRedactionText")}</p>`)}
    ${section(t("permissionsTitle"), `<p>${t("permissionsIntro")}</p><ul class="disclosure">
      ${disclosure(t("activeTabs"), t("activeTabsText"))}
      ${disclosure(t("storagePerm"), t("storagePermText"))}
      ${disclosure(t("scriptingPerm"), t("scriptingPermText"))}
      ${disclosure(t("webRequestPerm"), t("webRequestPermText"))}
      ${disclosure(t("hostPerm"), t("hostPermText"))}
    </ul>`)}
    ${section(t("contactTitle"), `<p>${t("contactText")}</p>`)}
  `;
}

function fact(title, text) {
  return `<div class="fact"><dt>${title}</dt><dd>${text}</dd></div>`;
}

function permission(title, text) {
  return `<div class="permission"><strong>${title}</strong><span>${text}</span></div>`;
}

function section(title, body) {
  return `<h2>${title}</h2>${body}`;
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function disclosure(title, text) {
  return `<li><strong>${title}</strong>${text}</li>`;
}

function updateThemeLabel() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  const isDark = button.getAttribute("aria-checked") === "true";
  button.setAttribute("aria-label", isDark ? t("useLight") : t("useDark"));
}

document.addEventListener("DOMContentLoaded", initWebI18n);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-theme-toggle]")) {
    setTimeout(updateThemeLabel, 0);
  }
});
