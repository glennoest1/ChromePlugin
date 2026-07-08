# UI Spec — Bug Black Box

## Popup (380px width, tối đa 550px height, scroll nếu dài hơn)

### Trạng thái 1: Chưa recording (mặc định)
- Header: "🕵️ Bug Black Box"
- Mô tả ngắn: "Ghi lại thao tác, log, và lỗi để tạo báo cáo bug tự động"
- Nút lớn, nổi bật: **"⏺ Start Recording"** (màu đỏ #DC2626)
- Dòng nhỏ dưới nút: "Sẽ ghi console log, lỗi JS, và các bước bạn thao tác
  trên tab này"

### Trạng thái 2: Đang recording
- Banner đỏ nhấp nháy nhẹ ở đầu popup: "🔴 Đang ghi... (00:45)" — đếm giờ tăng
  dần theo thời gian thực (cập nhật mỗi giây bằng `setInterval` trong popup,
  hoặc tính từ `startedAt` mỗi khi popup mở lại)
- Số liệu nhỏ: "X console log · Y lỗi · Z click đã ghi" (đọc từ
  `eventBuffer` để đếm theo type)
- Nút lớn: **"⏹ Stop & Tạo Report"** (màu xám đậm #374151)

### Trạng thái 3: Xem trước report (sau khi Stop)
- Header: "📋 Report đã sẵn sàng"
- Tóm tắt nhanh: URL, thời lượng, số lỗi phát hiện (nếu số lỗi > 0, hiện dòng
  này màu đỏ nổi bật: "⚠️ Phát hiện N lỗi JavaScript")
- Thumbnail nhỏ của ảnh screenshot đã chụp
- Danh sách rút gọn "Bước tái hiện" (chỉ hiện các event type `"click"`, tối đa
  10 dòng đầu, có thể mở rộng xem hết)
- Nếu có lỗi JS: hiện riêng 1 khối "Lỗi phát hiện được" với nền đỏ nhạt, font
  monospace, hiển thị message + stack trace rút gọn
- Hai nút cuối:
  - **"⬇️ Tải Report (.md)"** — màu xanh dương chủ đạo (#2563EB)
  - **"🗑️ Xóa & Ghi lại"** — quay về Trạng thái 1

### Empty state đặc biệt
Nếu Stop Recording nhưng không phát hiện lỗi JS nào và không có console.error
nào: vẫn tạo report bình thường nhưng thêm dòng thông báo tích cực nhỏ màu
xanh lá: "✅ Không phát hiện lỗi JavaScript nào trong quá trình ghi"

## Trạng thái lỗi/cảnh báo cần xử lý trong UI
- Nếu người dùng bấm Start Recording trên trang đặc biệt không inject được
  content script (ví dụ `chrome://` pages, Chrome Web Store): hiện thông báo
  "Không thể ghi trên trang này. Vui lòng thử trên 1 trang web thông thường."
  và KHÔNG chuyển sang trạng thái đang recording
- Nếu `chrome.tabs.captureVisibleTab` thất bại khi Stop: vẫn tạo report nhưng
  bỏ qua phần ảnh, hiện dòng "Không thể chụp ảnh màn hình" thay vì làm cả
  report bị lỗi

## Màu sắc & phong cách
- Màu chủ đạo hành động ghi: đỏ (#DC2626) — gợi cảm giác "recording" quen
  thuộc (giống nút record video)
- Màu hành động xuất file: xanh dương (#2563EB)
- Nền report preview: xám rất nhạt (#F9FAFB), khối code/log dùng font
  monospace (`"SF Mono", Consolas, monospace`) nền đen nhạt/xám đậm để dễ phân
  biệt với text thường
- Bo góc 6-8px, đồng nhất với các extension trước
