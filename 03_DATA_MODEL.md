# Data Model — Bug Black Box

Toàn bộ dữ liệu tạm thời lưu trong `chrome.storage.local` trong lúc recording,
xóa sau khi report được xuất (không cần giữ lại lâu dài trong MVP).

## 1. `recordingState`
```json
{
  "recordingState": {
    "isRecording": true,
    "startedAt": 1751800000000,
    "tabId": 123,
    "tabUrl": "https://example.com/checkout"
  }
}
```

## 2. `eventBuffer`
Mảng các event ghi được trong lúc recording, tối đa 500 phần tử (xem giới hạn
ở `02_TECH_ARCHITECTURE.md`).

```json
{
  "eventBuffer": [
    {
      "type": "console",
      "level": "log",
      "message": "Page loaded",
      "timestamp": 1751800010000
    },
    {
      "type": "click",
      "selector": ".add-to-cart-btn",
      "text": "Thêm vào giỏ hàng",
      "timestamp": 1751800015000
    },
    {
      "type": "jsError",
      "message": "Cannot read properties of undefined (reading 'total')",
      "source": "app.js",
      "lineno": 234,
      "colno": 12,
      "stack": "TypeError: ...\n    at calculateTotal (app.js:234:12)",
      "timestamp": 1751800022000
    }
  ]
}
```

- `type`: một trong `"console"` | `"click"` | `"jsError"`
- Trường `level` chỉ có ở type `"console"` (`"log"` | `"warn"` | `"error"`)
- Trường `selector`, `text` chỉ có ở type `"click"`
- Trường `source`, `lineno`, `colno`, `stack` chỉ có ở type `"jsError"`
  (một số trường có thể null nếu là unhandledrejection)

## 3. `lastReport` (kết quả sau khi Stop Recording, dùng để hiển thị màn hình
   xem trước trong popup trước khi xuất file)

```json
{
  "lastReport": {
    "tabUrl": "https://example.com/checkout",
    "startedAt": 1751800000000,
    "stoppedAt": 1751800045000,
    "durationSeconds": 45,
    "events": [ "... giống cấu trúc eventBuffer ở trên ..." ],
    "screenshotBase64": "data:image/png;base64,iVBORw0KG..."
  }
}
```

## Vòng đời dữ liệu
- Khi bấm **Start Recording**: xóa `eventBuffer` cũ, tạo `recordingState` mới
- Trong lúc recording: liên tục append vào `eventBuffer`
- Khi bấm **Stop Recording**: đóng gói `eventBuffer` + screenshot thành
  `lastReport`, set `recordingState.isRecording = false`
- Khi người dùng xuất file xong (hoặc đóng report view): có thể xóa
  `lastReport` và `eventBuffer` để giải phóng storage — không bắt buộc lưu
  lịch sử lâu dài trong MVP (đó là tính năng P2)

## Giới hạn dung lượng
- `chrome.storage.local` có giới hạn mặc định ~10MB (đủ dùng cho use case này)
- Ảnh screenshot base64 PNG của 1 viewport thường 200KB-1MB tùy độ phân giải —
  chấp nhận được, không cần nén thêm trong MVP
