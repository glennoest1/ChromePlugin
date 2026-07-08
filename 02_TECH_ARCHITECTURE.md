# Technical Architecture — Bug Black Box

## Stack
- Manifest V3
- HTML/CSS/JS thuần, không framework, không build step
- `chrome.storage.local` để lưu recording session tạm thời (buffer trong lúc
  đang ghi)
- Content script inject vào tab để bắt console log + lỗi JS + click events
- Background service worker để điều phối trạng thái recording + chụp ảnh

## Cấu trúc thư mục
```
bug-black-box/
├── manifest.json
├── background.js            # Điều phối start/stop, chụp ảnh, tổng hợp report
├── content.js                # Inject vào tab: bắt console, lỗi JS, click
├── injected.js                # Chạy trong context của trang (MAIN world) để
│                                override console — xem giải thích bên dưới
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js               # UI Start/Stop + xem report
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Vấn đề kỹ thuật quan trọng: Bắt console.log từ content script

Content script thông thường chạy trong "isolated world" — KHÔNG thể override
trực tiếp `window.console.log` của trang vì nó chạy trong context riêng biệt,
tách khỏi context thật của trang web.

**Giải pháp bắt buộc phải dùng**: Inject 1 script vào "MAIN world" (context
thật của trang) để override console, sau đó dùng `window.postMessage` để gửi
dữ liệu log từ MAIN world sang content script (isolated world), rồi content
script forward tiếp lên background.js.

Cách khai báo trong manifest.json (Manifest V3 hỗ trợ `world: "MAIN"` từ
Chrome 111+):

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["injected.js"],
    "world": "MAIN",
    "run_at": "document_start"
  },
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }
]
```

### `injected.js` (chạy trong MAIN world — context thật của trang)
```js
(function () {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  function forward(level, args) {
    window.postMessage({
      __bugBlackBox: true,
      type: "console",
      level,
      message: args.map(a => {
        try { return typeof a === "string" ? a : JSON.stringify(a); }
        catch { return String(a); }
      }).join(" "),
      timestamp: Date.now()
    }, "*");
  }

  console.log = function (...args) { forward("log", args); originalLog.apply(console, args); };
  console.warn = function (...args) { forward("warn", args); originalWarn.apply(console, args); };
  console.error = function (...args) { forward("error", args); originalError.apply(console, args); };

  window.addEventListener("error", (event) => {
    window.postMessage({
      __bugBlackBox: true,
      type: "jsError",
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack || null,
      timestamp: Date.now()
    }, "*");
  });

  window.addEventListener("unhandledrejection", (event) => {
    window.postMessage({
      __bugBlackBox: true,
      type: "jsError",
      message: "Unhandled Promise Rejection: " + String(event.reason),
      stack: event.reason?.stack || null,
      timestamp: Date.now()
    }, "*");
  });
})();
```

### `content.js` (isolated world — nhận message, forward lên background)
```js
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || !event.data.__bugBlackBox) return;

  chrome.runtime.sendMessage({
    action: "recordEvent",
    payload: event.data
  });
});

// Bắt click events (chạy trong isolated world là đủ, không cần MAIN world)
document.addEventListener("click", (event) => {
  const el = event.target;
  const selector = buildSimpleSelector(el);
  const text = (el.innerText || el.value || "").slice(0, 60);

  chrome.runtime.sendMessage({
    action: "recordEvent",
    payload: {
      type: "click",
      selector,
      text,
      timestamp: Date.now()
    }
  });
}, true);

function buildSimpleSelector(el) {
  if (el.id) return "#" + el.id;
  if (el.className && typeof el.className === "string") {
    return el.tagName.toLowerCase() + "." + el.className.trim().split(/\s+/).join(".");
  }
  return el.tagName.toLowerCase();
}
```

**Quan trọng**: content.js phải LUÔN LUÔN forward mọi message lên
background.js, nhưng background.js chỉ LƯU lại nếu đang trong trạng thái
`isRecording === true`. Việc bật/tắt ghi được kiểm soát ở background, không
phải ở content script, để tránh phải inject/remove script liên tục.

## Luồng hoạt động

1. **Start Recording**: popup.js gửi message `startRecording` tới background.js
   → background.js set `isRecording = true`, xóa buffer cũ, ghi lại
   `startedAt = Date.now()` và `tabUrl`
2. **Trong lúc recording**: content.js liên tục forward event (console, error,
   click) → background.js nhận qua `chrome.runtime.onMessage`, nếu
   `isRecording === true` thì đẩy vào mảng buffer trong `chrome.storage.local`
3. **Stop Recording**: popup.js gửi message `stopRecording` → background.js:
   - Set `isRecording = false`
   - Gọi `chrome.tabs.captureVisibleTab()` để chụp ảnh tab hiện tại (ảnh dạng
     base64 PNG)
   - Tổng hợp toàn bộ buffer + ảnh thành object report hoàn chỉnh (xem
     `03_DATA_MODEL.md`)
   - Trả kết quả về cho popup để hiển thị màn hình xem trước report
4. **Xuất report**: popup.js build chuỗi Markdown từ report object, dùng
   `Blob` + tạo link tải (`<a download>`) để xuất file `.md`. Ảnh chụp màn hình
   xuất riêng thành file `.png` cùng lúc (2 file tải về), hoặc nhúng base64
   trực tiếp vào file markdown dạng `![screenshot](data:image/png;base64,...)`
   — khuyến nghị nhúng base64 trực tiếp để chỉ cần 1 file duy nhất, dễ chia sẻ
   hơn.

## Giới hạn kỹ thuật cần lưu ý
- `chrome.tabs.captureVisibleTab` chỉ chụp được phần nhìn thấy trong viewport,
  không chụp toàn trang dài — đây là giới hạn chấp nhận được cho MVP
- Giới hạn buffer log tối đa 500 dòng trong 1 session recording để tránh
  storage phình to nếu người dùng quên bấm Stop quá lâu — khi vượt 500, xóa
  bớt các dòng cũ nhất (giữ log gần nhất là quan trọng nhất)

## Multi-tab recording

Popup gui `mode` khi start recording:

- `activeTab`: chi nhan event tu `rootTabId`, giu hanh vi current-tab cu.
- `allTabs`: nhan event tu nhieu tab recordable trong cung session.

Background giu `recordingState.tabs` cho metadata theo tab va `eventBuffersByTab` cho event buffer theo tab. `appendEvent(rawEvent, tabId)` la diem routing duy nhat: kiem tra mode, them metadata neu tab moi xuat hien, roi append vao buffer cua dung tab. Network error cung di qua cung routing nay nen report luon attach loi mang vao dung tab.

Khi Stop Recording, report sinh ra theo contract v2 (`version`, `mode`, `rootTabId`, `tabs[]`). Screenshot chi chup root tab de tranh tu dong chuyen qua nhieu tab cua nguoi dung. Sample report dung chung nam o `.task/samples/phase-1-report-v2.sample.json`.
