# Manifest Spec — manifest.json (Bug Black Box)

```json
{
  "manifest_version": 3,
  "name": "Bug Black Box",
  "version": "1.0.0",
  "description": "Ghi lại console log, lỗi JS, và thao tác của bạn để tạo báo cáo bug tự động.",
  "permissions": ["storage", "activeTab", "tabs", "scripting"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
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
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Ghi chú quan trọng

- `"world": "MAIN"` cho `injected.js` yêu cầu **Chrome phiên bản 111 trở lên**.
  Đây là API tương đối mới trong Manifest V3, cần Codex kiểm tra kỹ khi test —
  nếu Chrome đang dùng quá cũ, script sẽ không chạy đúng context.
- `"matches": ["<all_urls>"]` là cần thiết ở đây (khác với Page Summarizer)
  vì content script cần tự động chạy trên MỌI trang để sẵn sàng ghi log ngay
  khi người dùng bấm Start — không thể dùng `activeTab` cho content script tự
  động chạy.
- `"tabs"` permission (không chỉ `"activeTab"`) cần thiết để lấy được `tab.url`
  đầy đủ và gọi `chrome.tabs.captureVisibleTab()` đúng cách.
- KHÔNG cần `"host_permissions"` riêng vì không gọi API bên ngoài trong MVP
  (chỉ thêm khi làm Task 8 — AI Explain — lúc đó cần thêm
  `"host_permissions": ["https://api.anthropic.com/*"]`)
- Nếu làm thêm Task 9 (P2 — network log), cần thêm permission `"webRequest"`
  vào mảng permissions

## Cân nhắc về quyền riêng tư khi khai báo permissions
`<all_urls>` là quyền khá rộng. Khi demo, nên giải thích rõ với sếp: extension
chỉ ACTIVE ghi dữ liệu khi người dùng chủ động bấm Start (không ghi ngầm mặc
định), việc script có mặt trên mọi trang chỉ để sẵn sàng phản hồi ngay khi
được kích hoạt.

## Icon
Nếu không có công cụ thiết kế, dùng script Python Pillow tạo hình vuông màu
đen/xám đậm (#1F2937), chữ "BB" trắng ở giữa hoặc biểu tượng hộp đen đơn giản,
xuất 3 kích thước 16/48/128px PNG.
