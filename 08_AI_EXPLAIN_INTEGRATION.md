# AI Explain Integration — Bug Black Box (P1, làm sau khi MVP xong)

Chỉ bắt đầu đọc và triển khai file này sau khi Task 1-7 trong
`05_TASK_BREAKDOWN.md` đã hoàn thành và test đầy đủ.

## Mục tiêu tính năng
Biến log kỹ thuật khó hiểu thành 1 đoạn giải thích ngắn, dễ hiểu, cho biết
"chuyện gì đã xảy ra" — không phải giải thích từng dòng code, mà tóm tắt bản
chất vấn đề ở mức khái niệm.

## Endpoint & Headers (giống hệt các extension trước — đã verify)
```
POST https://api.anthropic.com/v1/messages

Headers:
x-api-key: <API_KEY_CUA_NGUOI_DUNG>
anthropic-version: 2023-06-01
content-type: application/json
```

**Lưu ý**: header là `x-api-key`, KHÔNG PHẢI `Authorization: Bearer`.

## Model
```
claude-sonnet-4-6
```

## Cấu hình API key
- Thêm trang `options/options.html` giống pattern đã dùng ở Page Summarizer:
  input để nhập/lưu/xóa Anthropic API key vào `chrome.storage.local` dưới key
  `apiConfig.apiKey`
- Khai báo `"options_page": "options/options.html"` trong manifest.json
- Thêm `"host_permissions": ["https://api.anthropic.com/*"]` vào manifest.json

## Prompt xây dựng cho tính năng Explain

```js
function buildExplainPrompt(report) {
  const errors = report.events
    .filter(e => e.type === "jsError")
    .map(e => `- ${e.message}${e.stack ? "\n  Stack: " + e.stack.split("\n")[0] : ""}`)
    .join("\n");

  const consoleErrors = report.events
    .filter(e => e.type === "console" && e.level === "error")
    .map(e => `- ${e.message}`)
    .join("\n");

  const steps = report.events
    .filter(e => e.type === "click")
    .map((e, i) => `${i + 1}. Clicked "${e.text || e.selector}"`)
    .join("\n");

  return `Bạn là một trợ lý debug giúp giải thích lỗi kỹ thuật bằng ngôn ngữ
đơn giản, dễ hiểu cho người không rành kỹ thuật sâu (ví dụ PM, QA). Dựa trên
thông tin dưới đây, hãy viết 1 đoạn giải thích ngắn (3-5 câu) bằng tiếng Việt
về việc "chuyện gì đã xảy ra" — tránh thuật ngữ kỹ thuật khó hiểu, tập trung
vào NGUYÊN NHÂN GỐC ở mức khái niệm, không liệt kê lại y nguyên log.

Các bước người dùng đã thao tác:
${steps || "(không có dữ liệu)"}

Lỗi JavaScript phát hiện được:
${errors || "(không có lỗi JS)"}

Console error khác:
${consoleErrors || "(không có)"}

Chỉ trả lời đoạn giải thích, không thêm tiêu đề hay lời dẫn.`;
}
```

## Hàm gọi API

```js
async function explainWithAI(report) {
  const { apiConfig } = await chrome.storage.local.get("apiConfig");

  if (!apiConfig || !apiConfig.apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const prompt = buildExplainPrompt(report);

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiConfig.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }]
      })
    });
  } catch (networkError) {
    throw new Error("NETWORK_ERROR");
  }

  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 429) throw new Error("RATE_LIMIT");
  if (!response.ok) throw new Error("UNKNOWN_ERROR");

  const data = await response.json();
  const textBlock = data.content?.find(block => block.type === "text");
  if (!textBlock) throw new Error("EMPTY_RESPONSE");

  return textBlock.text;
}
```

## Bảng thông báo lỗi (tiếng Việt) — giống pattern các extension trước

| Error thrown      | Thông báo hiển thị                                              |
|--------------------|--------------------------------------------------------------------|
| `MISSING_API_KEY`  | "Cần cấu hình API key trong Settings để dùng tính năng này."       |
| `INVALID_API_KEY`  | "API key không hợp lệ. Kiểm tra lại trong Settings."               |
| `NETWORK_ERROR`     | "Không thể kết nối tới máy chủ AI. Kiểm tra kết nối mạng."         |
| `RATE_LIMIT`        | "Đã vượt giới hạn sử dụng API. Thử lại sau ít phút."               |
| `UNKNOWN_ERROR`     | "Đã có lỗi xảy ra khi gọi AI. Thử lại sau."                        |

## Nơi hiển thị kết quả
- Trong report preview (Trạng thái 3 của popup): thêm 1 khối "🧠 Giải thích
  bằng AI" ngay dưới khối lỗi JS, hiện đoạn text trả về
- Khi xuất file Markdown: thêm phần "## Giải thích bằng ngôn ngữ dễ hiểu" ở
  cuối file (đúng như mẫu report trong `01_PRODUCT_SPEC.md`)
- Nút "Giải thích bằng AI" chỉ hiện nếu `report.events` có ít nhất 1 phần tử
  type `"jsError"` hoặc console error — không hiện nút này nếu report sạch,
  vì không có gì để giải thích
