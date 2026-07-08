# Product Spec — Bug Black Box

## Vấn đề cần giải quyết
Khi QA/dev/end-user gặp lỗi trên web app, họ thường chỉ báo được: "em bấm cái
này rồi nó lỗi" — không có console log, không có bước tái hiện rõ ràng, không
có ảnh chụp. Dev nhận báo cáo mơ hồ này rất khó debug. Bug Black Box tự động
ghi lại quá trình đó và xuất thành báo cáo có cấu trúc.

## Đối tượng người dùng
QA tester, developer, hoặc support team cần báo cáo lỗi cho dev một cách rõ
ràng thay vì mô tả bằng lời.

## Phân loại tính năng — ĐỌC KỸ PHẦN NÀY TRƯỚC KHI CODE

### 🟢 MVP / P0 — Bắt buộc, làm trong vài giờ đầu
Đây là toàn bộ những gì cần có để demo được. Dừng lại ở đây nếu hết thời gian —
kết quả vẫn là 1 sản phẩm hoàn chỉnh, dùng được, không dở dang.

1. **Start/Stop Recording**: 2 nút trong popup.
   - "Start Recording": bắt đầu ghi console log + lỗi JS xảy ra trên tab hiện
     tại, ghi lại các bước click/thao tác cơ bản (xem chi tiết ở
     `02_TECH_ARCHITECTURE.md`)
   - "Stop Recording": dừng ghi, chuyển sang màn hình xem trước report

2. **Console log capture**: Ghi lại toàn bộ `console.log/warn/error` phát sinh
   trong lúc recording, kèm timestamp.

3. **JavaScript error capture**: Bắt lỗi runtime (`window.onerror` +
   `unhandledrejection`) xảy ra trong lúc recording — đây là phần quan trọng
   nhất vì là nguyên nhân trực tiếp gây lỗi.

4. **Ghi lại thao tác người dùng (click trail)**: Ghi lại danh sách các phần
   tử người dùng đã click (selector CSS đơn giản + text hiển thị + timestamp)
   để tái hiện "bước tái hiện lỗi" — KHÔNG ghi nội dung gõ vào input (tránh lộ
   dữ liệu nhạy cảm), chỉ ghi loại hành động (click, submit form).

5. **Chụp ảnh màn hình lúc Stop**: Dùng `chrome.tabs.captureVisibleTab` để
   chụp 1 ảnh tab hiện tại ngay khi bấm Stop, gắn vào report.

6. **Xuất report dạng Markdown**: Tự động tổng hợp các mục trên thành 1 file
   `.md` có cấu trúc rõ ràng (xem cấu trúc report mẫu bên dưới), tải về máy.

### 🟡 P1 — Làm nếu còn thời gian sau khi P0 xong hoàn chỉnh
7. **AI Explain**: Gửi console log + lỗi JS lên Anthropic API, yêu cầu giải
   thích bằng ngôn ngữ dễ hiểu ("What broke, in plain English"). Xem chi tiết
   đầy đủ trong `08_AI_EXPLAIN_INTEGRATION.md`.
8. **Network request log (rút gọn)**: Dùng `chrome.webRequest` (hoặc
   `chrome.debugger` API) để ghi lại các request bị lỗi (status >= 400) trong
   lúc recording — chỉ ghi method, URL, status code, KHÔNG ghi request/response
   body.

### 🔴 P2 — Điểm cộng, chỉ làm nếu dư rất nhiều thời gian
9. Lưu lịch sử các report đã tạo trong storage để xem lại
10. Cho phép chỉnh sửa report trước khi xuất (thêm ghi chú thủ công)

## KHÔNG làm trong bản này (out of scope hoàn toàn)
- Replay session dạng video
- Tích hợp Jira/GitHub/Slack
- Auto detect root cause bằng AI (khác với "explain log", đây là suy luận sâu
  hơn nhiều, không khả thi trong vài giờ)
- Chia sẻ report qua link (cần backend/server)
- Team workspace, đăng nhập tài khoản
- Record trên nhiều tab cùng lúc — chỉ record 1 tab đang active

## Cấu trúc report Markdown mẫu (MVP)

```markdown
# Bug Report — [Tên trang / URL]

**Thời gian ghi:** 2026-07-06 14:32:10
**URL:** https://example.com/checkout
**Thời lượng recording:** 45 giây

## Bước tái hiện lỗi (Steps to Reproduce)
1. [14:32:15] Click vào nút "Thêm vào giỏ hàng" (selector: `.add-to-cart-btn`)
2. [14:32:18] Click vào link "Thanh toán" (selector: `#checkout-link`)
3. [14:32:22] Submit form (selector: `#payment-form`)

## Lỗi JavaScript (Errors)
```
[14:32:22] TypeError: Cannot read properties of undefined (reading 'total')
    at calculateTotal (app.js:234:12)
    at submitHandler (app.js:189:8)
```

## Console Log
```
[14:32:10] LOG: Page loaded
[14:32:15] LOG: Item added to cart
[14:32:22] ERROR: Failed to calculate total
```

## Ảnh chụp màn hình
![screenshot](screenshot.png)

## Giải thích bằng ngôn ngữ dễ hiểu (nếu bật AI Explain)
> App đã cố tính tổng tiền nhưng dữ liệu giỏ hàng bị thiếu, khiến hàm tính
> toán không hoạt động được.
```
