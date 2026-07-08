# Task Breakdown — Bug Black Box

Thực hiện tuần tự. Task 1-7 là MVP bắt buộc. Task 8+ chỉ làm nếu còn thời gian
sau khi toàn bộ MVP đã test và chạy ổn định.

## Task 1 — Khởi tạo cấu trúc & manifest
- Tạo thư mục `bug-black-box/` theo cấu trúc trong `02_TECH_ARCHITECTURE.md`
- Tạo `manifest.json` theo `07_MANIFEST_SPEC.md`, chú ý phần `content_scripts`
  với `world: "MAIN"` cho `injected.js`
- Tạo icon 16/48/128px (màu đen/xám #1F2937, biểu tượng hộp đen đơn giản hoặc
  chữ "BB" trắng ở giữa, dùng script Pillow nếu cần)
- **Test**: Load unpacked, extension hiện lên không lỗi

## Task 2 — Injected script bắt console + lỗi JS
- Viết `injected.js` chính xác theo code mẫu trong `02_TECH_ARCHITECTURE.md`
- Viết `content.js` phần nhận `postMessage` và forward console/error events
- **Test**: Mở DevTools Console trên 1 trang bất kỳ, gõ `console.log("test")`,
  kiểm tra qua `chrome.runtime.onMessage` (log ra console của background service
  worker) rằng message được forward đúng — CHƯA cần lưu vào storage ở bước này,
  chỉ cần xác nhận luồng message hoạt động

## Task 3 — Background: quản lý trạng thái recording
- Viết `background.js`:
  - Xử lý message `startRecording`: set `recordingState.isRecording = true`,
    xóa `eventBuffer` cũ, ghi `startedAt`, `tabId`, `tabUrl`
  - Xử lý message `recordEvent` từ content.js: CHỈ lưu vào `eventBuffer` nếu
    `isRecording === true` và event đến từ đúng `tabId` đang được ghi (tránh
    ghi nhầm event từ tab khác)
  - Giới hạn `eventBuffer` tối đa 500 phần tử (xóa bớt phần tử cũ nhất khi vượt)
- **Test**: Start recording, thao tác vài lần trên trang, kiểm tra
  `chrome.storage.local.get(null, console.log)` thấy `eventBuffer` có dữ liệu
  đúng

## Task 4 — Bắt click events (bước tái hiện lỗi)
- Thêm phần bắt click trong `content.js` theo code mẫu ở
  `02_TECH_ARCHITECTURE.md`, dùng hàm `buildSimpleSelector`
- **Test**: Start recording, click vài phần tử khác nhau trên trang (nút, link,
  input), Stop, kiểm tra `eventBuffer` có đúng số lượng click với selector hợp
  lý (không phải rỗng hoặc sai)

## Task 5 — Stop Recording + chụp ảnh + tổng hợp report
- Xử lý message `stopRecording` trong background.js:
  - Set `isRecording = false`
  - Gọi `chrome.tabs.captureVisibleTab()` lấy ảnh base64
  - Đọc `eventBuffer`, tính `durationSeconds` từ `startedAt` tới hiện tại
  - Ghi tất cả vào `lastReport` theo cấu trúc trong `03_DATA_MODEL.md`
  - Trả `lastReport` về cho popup qua response của `sendMessage`
- **Test**: Start → thao tác → Stop, kiểm tra `lastReport` trong storage có đầy
  đủ: events, screenshotBase64 không rỗng, durationSeconds hợp lý

## Task 6 — Popup UI: 3 trạng thái
- Viết `popup.html` + `popup.css` + `popup.js` theo `04_UI_SPEC.md`
- Trạng thái 1 (chưa recording): nút Start, gửi message `startRecording`
- Trạng thái 2 (đang recording): đồng hồ đếm giờ, số liệu event, nút Stop
- Trạng thái 3 (report preview): hiển thị tóm tắt + thumbnail + danh sách bước
  + khối lỗi (nếu có)
- Xử lý case đặc biệt: trang không inject được content script (xem
  `04_UI_SPEC.md` phần Trạng thái lỗi)
- **Test**: Test đầy đủ chu trình Start → thao tác thật (click vài nút trên 1
  trang demo) → Stop → xem preview hiện đúng dữ liệu

## Task 7 — Xuất report Markdown
- Viết hàm build chuỗi Markdown từ `lastReport` theo đúng mẫu cấu trúc trong
  `01_PRODUCT_SPEC.md` phần "Cấu trúc report Markdown mẫu"
- Nhúng screenshot dạng base64 trực tiếp vào markdown
  (`![screenshot](data:image/png;base64,...)`)
- Dùng `Blob` + link `<a download>` để tải file `.md` về máy, đặt tên file
  dạng `bug-report-YYYYMMDD-HHmmss.md`
- **Test**: Bấm "Tải Report", mở file `.md` tải về bằng 1 trình đọc markdown
  bất kỳ (VD: mở trong VS Code hoặc GitHub), kiểm tra format hiển thị đúng,
  ảnh hiện được, log/lỗi hiển thị rõ ràng dễ đọc

## Task 8 (P1) — AI Explain
- Chỉ bắt đầu task này sau khi Task 1-7 đã hoàn thành và test đầy đủ
- Xem chi tiết đầy đủ trong `08_AI_EXPLAIN_INTEGRATION.md`
- Thêm trang Options để nhập Anthropic API key (tương tự pattern đã dùng ở các
  extension trước)
- Thêm nút "🧠 Giải thích lỗi bằng AI" trong report preview, chỉ hiện nếu report
  có ít nhất 1 lỗi JS
- **Test**: Với 1 report có lỗi JS thật, bấm nút, kiểm tra nhận được đoạn giải
  thích dễ hiểu, và đoạn này được thêm vào phần cuối report khi xuất file

## Task 9 (P2) — Network error log rút gọn
- Chỉ làm nếu Task 8 đã xong và còn thời gian
- Dùng `chrome.webRequest.onErrorOccurred` và `onCompleted` (lọc status >= 400)
  để ghi thêm các request lỗi vào `eventBuffer` với type `"networkError"`
- Cần thêm permission `"webRequest"` vào manifest.json

## Task 10 — Polish & README
- Viết `README.md` hướng dẫn cài đặt + cách dùng (Start → thao tác → Stop →
  Tải report)
- Rà lại toàn bộ: xóa console.log thừa, đảm bảo không log dữ liệu nhạy cảm nào
  (input value, cookie) theo đúng nguyên tắc trong `00_README.md`
