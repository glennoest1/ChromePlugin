# Acceptance Criteria — Bug Black Box

## Cài đặt & khởi động
- [ ] Load unpacked không lỗi manifest
- [ ] Icon hiện trên toolbar, click mở popup không vỡ layout

## Start Recording
- [ ] Bấm Start trên 1 trang web thông thường (không phải chrome:// page) →
      chuyển sang trạng thái "Đang recording" ngay lập tức
- [ ] Đồng hồ đếm giờ chạy đúng, tăng theo thời gian thực
- [ ] Bấm Start trên trang `chrome://extensions` (không inject được) → hiện
      thông báo lỗi phù hợp, KHÔNG chuyển sang trạng thái recording

## Ghi log trong lúc recording
- [ ] Gõ `console.log("test")` trong DevTools Console của trang đang recording
      → sau khi Stop, log này xuất hiện đúng trong report
- [ ] Cố tình gây lỗi JS thật (ví dụ gõ code lỗi trong Console hoặc vào 1 trang
      demo có lỗi có sẵn) → lỗi xuất hiện đúng trong report với message + stack
      trace rõ ràng
- [ ] Click vào 3-5 phần tử khác nhau trên trang → tất cả xuất hiện trong danh
      sách "Bước tái hiện" theo đúng thứ tự thời gian

## Stop Recording & Report Preview
- [ ] Bấm Stop → chuyển sang màn hình preview trong vòng 1-2 giây, không bị
      treo/đứng im
- [ ] Ảnh screenshot hiện đúng nội dung tab tại thời điểm bấm Stop
- [ ] Số liệu tóm tắt (số log, số lỗi, số click) khớp với những gì đã thao tác
      thực tế trong lúc test
- [ ] Nếu không có lỗi JS nào: hiện đúng dòng thông báo tích cực thay vì để
      trống hoặc gây hiểu lầm

## Xuất Report
- [ ] File `.md` tải về đúng tên định dạng `bug-report-YYYYMMDD-HHmmss.md`
- [ ] Mở file bằng markdown viewer bất kỳ: cấu trúc đúng theo mẫu (Steps to
      Reproduce, Errors, Console Log, Screenshot)
- [ ] Ảnh screenshot hiển thị được trực tiếp trong file markdown (base64 nhúng
      đúng, không bị lỗi ảnh vỡ)
- [ ] Log/lỗi hiển thị trong code block, dễ đọc, không bị lẫn lộn định dạng

## Xóa & ghi lại
- [ ] Bấm "Xóa & Ghi lại" quay về đúng trạng thái ban đầu (Trạng thái 1), dữ
      liệu recording cũ không còn ảnh hưởng tới lần ghi mới

## Bảo mật & quyền riêng tư
- [ ] Kiểm tra code: KHÔNG có đoạn nào log giá trị của input type="password"
- [ ] Kiểm tra code: KHÔNG log toàn bộ nội dung gõ vào các input thường (chỉ
      log rằng có 1 action "click"/"submit", không log giá trị text người dùng
      nhập)
- [ ] Recording KHÔNG tự động bắt đầu khi cài extension hoặc mở trang mới —
      chỉ bắt đầu khi người dùng chủ động bấm Start

## AI Explain (nếu đã làm — P1)
- [ ] Với report có lỗi JS thật, bấm "Giải thích bằng AI" trả về đoạn giải
      thích dễ hiểu bằng tiếng Việt hoặc tiếng Anh (tùy cấu hình), không phải
      lặp lại y nguyên message lỗi kỹ thuật
- [ ] Nếu chưa cấu hình API key: nút này disable hoặc hiện nhắc nhập key,
      không gây lỗi khi bấm

## Định nghĩa "Done" cho buổi demo
Bắt buộc pass toàn bộ mục: "Start Recording", "Ghi log trong lúc recording",
"Stop Recording & Report Preview", "Xuất Report", "Bảo mật & quyền riêng tư".
AI Explain là điểm cộng rõ rệt nếu kịp làm nhưng không bắt buộc.

## Lưu ý khi demo trước sếp
- Chuẩn bị sẵn 1 trang demo có lỗi JS thật để tái hiện (ví dụ: 1 trang HTML tự
  viết có nút bấm cố tình gây lỗi `undefined.someProperty`) — đừng chỉ demo
  bằng console.log tay, hãy có lỗi thật để thấy tính năng bắt lỗi hoạt động rõ
- Đây là điểm khác biệt lớn nhất so với DevTools thông thường: hãy nhấn mạnh
  lúc demo rằng report này "kể lại câu chuyện" (bước → lỗi → ảnh) thay vì chỉ
  là log rời rạc
