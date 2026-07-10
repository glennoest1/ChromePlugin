const GEMINI_MODEL = "gemini-3.1-flash-lite"; // use this model because it has the most requests per day
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function explainLastReport(reportFromPopup) {
  const { apiConfig, lastReport } = await chrome.storage.local.get(["apiConfig", "lastReport"]);
  const report = reportFromPopup || lastReport;
  const events = getReportEvents(report);

  if (!apiConfig?.apiKey) throw new Error("MISSING_API_KEY");
  if (!events.length) throw new Error("EMPTY_REPORT");
  if (!hasExplainableError(report)) throw new Error("NO_ERRORS");

  const explanation = await explainWithAI(apiConfig.apiKey, report);
  const updatedReport = {
    ...report,
    aiExplanation: explanation
  };

  await chrome.storage.local.set({ lastReport: updatedReport });
  return { ok: true, explanation, report: updatedReport };
}

function hasExplainableError(report) {
  return getReportEvents(report).some((event) =>
    event.type === "jsError" ||
    (event.type === "console" && event.level === "error")
  );
}

async function explainWithAI(apiKey, report) {
  const prompt = buildExplainPrompt(report);
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      maxOutputTokens: 30000,
      temperature: 0.2
    }
  };
  let response;

  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
  } catch {
    throw new Error("NETWORK_ERROR");
  }

  if (response.status === 401 || response.status === 403) throw new Error("INVALID_API_KEY");
  if (response.status === 429) throw new Error("RATE_LIMIT");
  if (!response.ok) throw new Error("UNKNOWN_ERROR");

  const data = await response.json();

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("EMPTY_RESPONSE");

  return text;
}

function buildExplainPrompt(report) {
  const events = getReportEvents(report);
  const errors = events
    .filter((event) => event.type === "jsError")
    .map((event) => `- ${limitForAI(event.message)}${event.stack ? "\n  Stack: " + limitForAI(event.stack) : ""}`)
    .join("\n");

  const consoleErrors = events
    .filter((event) => event.type === "console" && event.level === "error")
    .map((event) => `- ${limitForAI(event.message)}`)
    .join("\n");

  const networkErrors = events
    .filter((event) => event.type === "networkError" || (event.type === "network" && (event.error || Number(event.statusCode) >= 400)))
    .map((event) => `- ${event.method} ${limitForAI(event.url)} ${event.statusCode ? "status " + event.statusCode : limitForAI(event.error)}${event.responseBody ? " response: " + limitForAI(event.responseBody) : ""}`)
    .join("\n");

  const steps = events
    .filter((event) => event.type === "click" || event.type === "submit")
    .map((event, index) => `${index + 1}. ${event.type === "submit" ? "Submitted" : "Clicked"} "${event.text || event.selector}"`)
    .join("\n");

  return `Bạn là trợ lý debug giúp giải thích lỗi kỹ thuật bằng ngôn ngữ đơn giản cho PM, QA hoặc người không chuyên sâu kỹ thuật.
Dựa trên thông tin bên dưới, hãy viết một đoạn giải thích ngắn 3-5 câu bằng tiếng Việt về chuyện gì đã xảy ra.
Không lặp lại nguyên văn log, không thêm tiêu đề, và tập trung vào nguyên nhân ở mức khái niệm.

Các bước người dùng đã thao tác:
${steps || "(không có dữ liệu)"}

Lỗi JavaScript phát hiện được:
${errors || "(không có lỗi JS)"}

Console error khác:
${consoleErrors || "(không có)"}

Network request lỗi:
${networkErrors || "(không có)"}

Chỉ trả lời đoạn giải thích.`;
}
