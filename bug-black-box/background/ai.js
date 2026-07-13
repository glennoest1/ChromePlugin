const GEMINI_MODEL = "gemini-3.1-flash-lite"; // use this model because it has the most requests per day
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function explainLastReport(reportFromPopup) {
  const { apiConfig, lastReport, bbbLanguage } = await chrome.storage.local.get([
    "apiConfig",
    "lastReport",
    "bbbLanguage"
  ]);
  const language = normalizeExplainLanguage(bbbLanguage || chrome.i18n?.getUILanguage?.());
  const report = reportFromPopup || lastReport;
  const events = getReportEvents(report);

  if (!apiConfig?.apiKey) throw new Error("MISSING_API_KEY");
  if (!events.length) throw new Error("EMPTY_REPORT");
  if (!hasExplainableError(report)) throw new Error("NO_ERRORS");

  const explanation = await explainWithAI(apiConfig.apiKey, report, language);
  const updatedReport = {
    ...report,
    aiExplanation: explanation,
    aiExplanationLanguage: language
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

async function explainWithAI(apiKey, report, language) {
  const prompt = buildExplainPrompt(report, language);
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

function buildExplainPrompt(report, language) {
  const copy = AI_PROMPT_COPY[normalizeExplainLanguage(language)];
  const events = getReportEvents(report);
  const errors = events
    .filter((event) => event.type === "jsError")
    .map((event) => `- ${limitForAI(event.message)}${event.stack ? `\n  ${copy.stack}: ${limitForAI(event.stack)}` : ""}`)
    .join("\n");

  const consoleErrors = events
    .filter((event) => event.type === "console" && event.level === "error")
    .map((event) => `- ${limitForAI(event.message)}`)
    .join("\n");

  const networkErrors = events
    .filter((event) => event.type === "networkError" || (event.type === "network" && (event.error || Number(event.statusCode) >= 400)))
    .map((event) => {
      const result = event.statusCode ? `${copy.status} ${event.statusCode}` : limitForAI(event.error);
      const responseBody = event.responseBody ? ` ${copy.response}: ${limitForAI(event.responseBody)}` : "";
      return `- ${event.method || "GET"} ${limitForAI(event.url)} ${result}${responseBody}`;
    })
    .join("\n");

  const steps = events
    .filter((event) => event.type === "click" || event.type === "submit")
    .map((event, index) => `${index + 1}. ${event.type === "submit" ? copy.submitted : copy.clicked} "${event.text || event.selector || copy.unknownTarget}"`)
    .join("\n");

  return `${copy.role}
${copy.task}
${copy.rules}

${copy.stepsLabel}:
${steps || copy.empty}

${copy.jsErrorsLabel}:
${errors || copy.noJsErrors}

${copy.consoleErrorsLabel}:
${consoleErrors || copy.empty}

${copy.networkErrorsLabel}:
${networkErrors || copy.empty}

${copy.finalRule}`;
}

function normalizeExplainLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("vi")) return "vi";
  if (value.startsWith("zh") || value.startsWith("cn")) return "zh";
  return "en";
}

const AI_PROMPT_COPY = {
  en: {
    role: "You are a debugging assistant who explains technical errors in plain language for PMs, QA engineers, or non-specialist users.",
    task: "Based on the information below, write a short 3-5 sentence explanation in English about what happened.",
    rules: "Do not repeat the raw logs verbatim, do not add a heading, and focus on the likely cause at a conceptual level.",
    stepsLabel: "User actions",
    jsErrorsLabel: "Detected JavaScript errors",
    consoleErrorsLabel: "Other console errors",
    networkErrorsLabel: "Failed network requests",
    finalRule: "Return only the explanation paragraph.",
    empty: "(no data)",
    noJsErrors: "(no JavaScript errors)",
    clicked: "Clicked",
    submitted: "Submitted",
    unknownTarget: "unknown target",
    stack: "Stack",
    status: "status",
    response: "response"
  },
  vi: {
    role: "Bạn là trợ lý debug giúp giải thích lỗi kỹ thuật bằng ngôn ngữ dễ hiểu cho PM, QA hoặc người không chuyên sâu kỹ thuật.",
    task: "Dựa trên thông tin bên dưới, hãy viết một đoạn giải thích ngắn 3-5 câu bằng tiếng Việt về chuyện gì đã xảy ra.",
    rules: "Không lặp lại nguyên văn log, không thêm tiêu đề, và tập trung vào nguyên nhân ở mức khái niệm.",
    stepsLabel: "Các bước người dùng đã thao tác",
    jsErrorsLabel: "Lỗi JavaScript phát hiện được",
    consoleErrorsLabel: "Console error khác",
    networkErrorsLabel: "Network request lỗi",
    finalRule: "Chỉ trả lời đoạn giải thích.",
    empty: "(không có dữ liệu)",
    noJsErrors: "(không có lỗi JavaScript)",
    clicked: "Đã click",
    submitted: "Đã submit",
    unknownTarget: "đối tượng không rõ",
    stack: "Stack",
    status: "status",
    response: "response"
  },
  zh: {
    role: "你是一名调试助手，需要用非技术人员也能理解的语言，为 PM、QA 或非专业用户解释技术错误。",
    task: "请根据下面的信息，用中文写一段 3-5 句的简短说明，解释发生了什么。",
    rules: "不要逐字重复原始日志，不要添加标题，并从概念层面说明可能原因。",
    stepsLabel: "用户操作步骤",
    jsErrorsLabel: "检测到的 JavaScript 错误",
    consoleErrorsLabel: "其他控制台错误",
    networkErrorsLabel: "失败的网络请求",
    finalRule: "只返回解释段落。",
    empty: "（没有数据）",
    noJsErrors: "（没有 JavaScript 错误）",
    clicked: "点击",
    submitted: "提交",
    unknownTarget: "未知目标",
    stack: "堆栈",
    status: "状态",
    response: "响应"
  }
};
