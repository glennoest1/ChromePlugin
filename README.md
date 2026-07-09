# Bug Black Box

Bug Black Box là Chrome Extension hoạt động như một "hộp đen" cho web app. Khi người dùng bấm **Start Recording**, extension ghi lại các thao tác chính, console log, lỗi JavaScript, request network bị lỗi và ảnh chụp màn hình tại thời điểm dừng. Sau đó extension tạo một file Markdown để gửi cho developer hoặc dùng với AI debug.

Project này là bản demo chạy trực tiếp bằng **Chrome Manifest V3**, dùng HTML/CSS/JavaScript thuần, không cần build step.

## Tính Năng

- Start/Stop recording trên tab hiện tại hoặc nhiều tab.
- Bắt `console.log`, `console.warn`, `console.error`.
- Bắt lỗi JavaScript từ `window.onerror` và `unhandledrejection`.
- Ghi lại click và submit form theo dạng metadata.
- Chụp ảnh viewport khi bấm Stop.
- Log network request lỗi bằng `chrome.webRequest` với status `>= 400` hoặc request fail.
- Ghi session replay bằng rrweb và xem lại bằng replay viewer local.
- Xuất report Markdown `.md` có steps, errors, console log, network errors, screenshot base64 và raw JSON.
- AI Explain dùng Gemini API để giải thích lỗi bằng ngôn ngữ dễ hiểu.
- Trang Options để người dùng tự nhập API key, không hardcode key.

## Cài Đặt

1. Mở Chrome và truy cập `chrome://extensions`.
2. Bật **Developer mode** ở góc phải.
3. Bấm **Load unpacked**.
4. Chọn thư mục:

   ```text
   E:\Bug Black Box\bug-black-box
   ```

5. Sau khi load xong, icon **Bug Black Box** sẽ xuất hiện trong danh sách extension.
6. Ghim extension lên toolbar nếu muốn thao tác nhanh.

Yêu cầu Chrome 111 trở lên vì `manifest.json` dùng:

```json
"world": "MAIN"
```

Phần này cần thiết để `injected.js` chạy trong context thật của trang web và bắt được console log của trang.

## Demo Nhanh

Repo có sẵn file demo:

```text
E:\Bug Black Box\test-page.html
```

Cách demo:

1. Mở `chrome://extensions`.
2. Tìm Bug Black Box.
3. Bật **Allow access to file URLs** nếu bạn mở `test-page.html` trực tiếp bằng `file://`.
4. Mở `test-page.html` trong Chrome.
5. Bấm icon Bug Black Box.
6. Bấm **Start Recording**.
7. Trên trang demo, bấm các nút:
   - **Write Console Log** để tạo console log.
   - **Trigger TypeError** để tạo lỗi JavaScript thật.
   - **Trigger Rejected Promise** để tạo unhandled promise rejection.
   - **Trigger Missing File Request** để tạo network error.
   - Submit form demo để kiểm tra submit action.
8. Bấm lại icon extension.
9. Bấm **Stop & Create Report**.
10. Kiểm tra preview rồi bấm **Download Report (.md)**.

Nếu không muốn bật quyền file URL, bạn có thể serve thư mục bằng local server rồi mở qua `http://localhost`.

Ví dụ:

```powershell
cd "E:\Bug Black Box"
python -m http.server 8080
```

Sau đó mở:

```text
http://localhost:8080/test-page.html
```

## Website và Release Package

Website tĩnh cho Chrome Web Store nằm trong `docs/`:

- `docs/index.html`: landing page public.
- `docs/privacy.html`: privacy policy public.
- `docs/icon128.png`: icon dùng cho website.

Trước khi submit Chrome Web Store, deploy `docs/` lên GitHub Pages, Vercel, Netlify hoặc Cloudflare Pages và dùng URL public của `privacy.html` trong dashboard.

Tạo ZIP release bằng PowerShell:

```powershell
.\package.ps1
```

Script đọc version từ `bug-black-box/manifest.json` và tạo:

```text
dist/bug-black-box-v<version>.zip
```

ZIP chỉ chứa nội dung extension cần upload, không chứa planning docs, website, `.git`, `.task` hoặc test page.

## Cách Dùng

### 1. Bắt đầu ghi

1. Mở một trang web bình thường, ví dụ `http://localhost:8080/test-page.html`.
2. Bấm icon Bug Black Box trên toolbar.
3. Bấm **Start Recording**.

Extension chỉ bắt đầu lưu dữ liệu sau khi bạn bấm Start. Nó không tự ghi ngầm khi cài đặt hoặc khi mở trang mới.

### 2. Tái hiện lỗi

Trong khi recording, hãy thao tác như người dùng thật:

- Click các nút/link cần test.
- Submit form nếu lỗi liên quan tới form.
- Kích hoạt lỗi JavaScript nếu có.
- Tạo request lỗi nếu muốn kiểm tra network log.

Extension sẽ ghi:

- Thời gian xảy ra event.
- Loại event: console, JS error, click, submit, network error.
- Selector đơn giản của phần tử được click.
- Text hiển thị của nút/link nếu an toàn để ghi.
- Message và stack trace của lỗi JavaScript.
- Method, URL đã redacted và status code của request lỗi.

### 3. Dừng ghi và xem report

1. Bấm lại icon Bug Black Box.
2. Bấm **Stop & Create Report**.
3. Popup sẽ hiển thị:
   - URL được ghi.
   - Thời lượng recording.
   - Số log, action, lỗi JS, lỗi network.
   - Screenshot tại thời điểm bấm Stop.
   - Steps to reproduce.
   - Lỗi phát hiện được.

Nếu không có lỗi JavaScript, report vẫn được tạo bình thường và popup sẽ hiển thị trạng thái không phát hiện lỗi.

### 4. Xuất report Markdown

Bấm **Download Report (.md)** để tải file có tên dạng:

```text
bug-report-YYYYMMDD-HHmmss.md
```

Report có cấu trúc:

- `Steps to Reproduce`
- `JavaScript Errors`
- `Network Errors`
- `Console Log`
- `Screenshot`
- `Plain-English Explanation` nếu đã dùng AI Explain

Screenshot được nhúng trực tiếp bằng base64, nên file Markdown có thể chia sẻ độc lập.

## AI Explain

AI Explain gửi thông tin lỗi trong report lên Gemini API để tạo đoạn giải thích ngắn, dễ hiểu.

Extension không có API key mặc định và không hardcode key vào source code.

### Cấu hình API key

1. Mở popup Bug Black Box.
2. Bấm nút Settings.
3. Nhập Gemini API key vào ô **Gemini API key**.
4. Bấm **Save Key**.

API key được lưu trong `chrome.storage.local` tại:

```text
apiConfig.apiKey
```

### Dùng AI Explain

1. Tạo một report có ít nhất một lỗi JavaScript hoặc `console.error`.
2. Ở màn hình preview report, bấm **Explain with AI**.
3. Extension sẽ gọi:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent
```

Header dùng đúng định dạng của Gemini:

```text
x-goog-api-key: <API_KEY>
content-type: application/json
```

Kết quả sẽ hiển thị trong preview và được thêm vào cuối file Markdown khi export.

Nếu chưa nhập API key, popup sẽ hiển thị nhắc cấu hình key thay vì làm hỏng report.

## Network Error Log

Extension dùng `chrome.webRequest` để ghi request lỗi trong lúc recording.

Các request được ghi khi:

- Request hoàn tất với status code `>= 400`.
- Request fail ở tầng network, ví dụ file không tồn tại, DNS/network error.

Dữ liệu được lưu:

- HTTP method.
- URL đã redacted.
- Status code nếu có.
- Browser network error nếu request fail.

Extension không ghi request body, response body, header nhạy cảm hoặc cookie.

## Quyền Riêng Tư

Bug Black Box được thiết kế để chỉ ghi dữ liệu cần thiết cho báo cáo lỗi.

Extension không ghi:

- Giá trị input password.
- Nội dung người dùng gõ vào input thường.
- Nội dung trong `textarea`.
- Nội dung trong vùng `contenteditable`.
- Cookie.
- Toàn bộ localStorage/sessionStorage.
- Request body hoặc response body.

Click vào input chỉ được ghi dạng:

```text
Click "input[type=text]"
Click "input[type=password]"
```

Các query parameter nhạy cảm trong URL sẽ được redacted nếu tên chứa:

```text
password, token, secret, authorization, cookie, apiKey, session
```

Recording chỉ diễn ra khi người dùng chủ động bấm **Start Recording**.

## Cấu Trúc Thư Mục

```text
bug-black-box/
  manifest.json
  background.js
  content.js
  injected.js
  session-recorder.js
  popup/
    popup.html
    popup.css
    popup.js
  options/
    options.html
    options.css
    options.js
  replay/
    replay.html
    replay.css
    replay.js
  vendor/
    rrweb.min.js
    rrweb-player.min.js
    rrweb-player.css
  icons/
    icon16.png
    icon48.png
    icon128.png
  scripts/
    generate_icons.py
  README.md
```

Vai trò chính:

- `manifest.json`: khai báo Manifest V3, popup, options page, permissions, content scripts.
- `injected.js`: chạy trong MAIN world để override console và bắt JS error.
- `content.js`: nhận `postMessage` từ `injected.js`, ghi click/submit an toàn, forward event lên background.
- `session-recorder.js`: ghi rrweb replay event khi recording bắt đầu.
- `background.js`: quản lý recording state, buffer theo tab, screenshot, report, replay data, network error log và AI Explain.
- `popup/`: giao diện Start, Stop, Preview, Export.
- `replay/`: replay viewer local cho rrweb events đã lưu.
- `options/`: lưu/xóa Gemini API key.
- `scripts/generate_icons.py`: tạo icon bằng Pillow.

## Kiểm Tra Thủ Công

Sau khi load unpacked, test theo checklist:

1. Bấm Start trên trang web bình thường, popup chuyển sang Recording.
2. Bấm Start trên `chrome://extensions`, popup báo không thể record trang này.
3. Tạo `console.log`, `console.warn`, `console.error`, kiểm tra report có log.
4. Bấm **Trigger TypeError** trên `test-page.html`, kiểm tra report có JS error và stack trace.
5. Click 3-5 phần tử, kiểm tra Steps to Reproduce đúng thứ tự.
6. Bấm **Trigger Missing File Request**, kiểm tra Network Errors có request lỗi.
7. Bấm Stop, kiểm tra screenshot hiển thị trong preview.
8. Download Markdown, mở file và kiểm tra các section.
9. Nhập API key, bấm Explain with AI trên report có lỗi, kiểm tra có đoạn giải thích.
10. Click vào input/password và submit form, kiểm tra report không chứa nội dung đã nhập.

## Lỗi Thường Gặp

### Không record được trên `chrome://` page

Chrome không cho content script chạy trên các trang nội bộ như `chrome://extensions`. Hãy test trên trang web thường, `localhost`, hoặc file demo có bật quyền file URL.

### Console log không xuất hiện

Kiểm tra Chrome version. Extension cần Chrome 111+ để `world: "MAIN"` hoạt động đúng.

Ngoài ra, log chỉ được lưu nếu xảy ra sau khi đã bấm **Start Recording**.

### Screenshot không có

`chrome.tabs.captureVisibleTab` chỉ chụp viewport hiện tại. Nếu Chrome chặn capture ở một trang đặc biệt, report vẫn được tạo nhưng phần screenshot sẽ báo unavailable.

### AI Explain báo thiếu API key

Mở Settings của extension, nhập Gemini API key và bấm Save Key.

### Network error không xuất hiện

Đảm bảo lỗi network xảy ra trong cùng tab đang recording. Task này chỉ ghi request lỗi, không ghi request thành công status `2xx/3xx`.

## Ghi Chú Kỹ Thuật

Luồng bắt console/error:

```text
Page MAIN world
  injected.js overrides console + listens to errors
  window.postMessage(...)

Content script isolated world
  content.js receives postMessage
  chrome.runtime.sendMessage(...)

Background service worker
  background.js checks isRecording and tabId
  append event to chrome.storage.local
```

Recording state được lưu trong `chrome.storage.local`:

```text
recordingState
eventBuffer
eventBuffersByTab
replayEvents
replayStatus
lastReport
apiConfig
```

`eventBuffer` được giới hạn tối đa 500 event để tránh phình storage khi người dùng quên bấm Stop.
