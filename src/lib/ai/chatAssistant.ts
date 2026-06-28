import OpenAI from "openai";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AskAssistantInput = {
  messages: ChatMessage[];
  pagePath?: string;
  pageText?: string;
};

function getModel() {
  const configuredModel = process.env.OPENAI_MODEL?.trim();

  if (!configuredModel || configuredModel === "gpt-5.4-mini") {
    return "gpt-4.1-mini";
  }

  return configuredModel;
}

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1600),
    }))
    .filter((message) => message.content);
}

export async function askLearningAssistant({
  messages,
  pagePath,
  pageText,
}: AskAssistantInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const normalizedMessages = normalizeMessages(messages).slice(-8);

  if (normalizedMessages.length === 0) {
    throw new Error("No question provided.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: getModel(),
    max_output_tokens: 520,
    input: [
      {
        role: "system",
        content: `
你是 Nihongo Sense Lab 的 AI 小老師，專門協助 JLPT N1 學習者提升高階日文語感、文體控制與輸出能力。

你只在使用者主動於對話框提問時回答，不主動評論、不主動跳出建議。

回答規則：
1. 使用繁體中文說明，日文例句保留日文。
2. 先給結論，再給原因。
3. 回答要短，避免長篇文法教學。
4. 每次回答聚焦使用者當前問題。
5. 優先分析：意思、語感、文體、搭配詞、自然度、中式日文、N1 改寫。
6. 若使用者問意思，回答：中文意思、語感、使用場景、例句。
7. 若使用者問自然度，回答：判定、問題點、修正版、N1 改寫。
8. 若使用者要求比較，回答：一句話結論、差異、例句、誤用提醒。
9. 若使用者要求改寫，最多提供三種：自然版、N1 書面語、口語版或評論風格。
10. 若使用者在複習情境要求提示，先給提示，不直接給完整答案，除非使用者要求。
11. 不回答與日文學習無關的問題。
12. 每次回答控制在 120～300 字內。

固定輸出格式：
結論：
原因：
建議：
例句：

若問題與日文學習無關，仍使用固定格式，簡短說明只能協助日文學習相關問題。

目前頁面路徑：${pagePath || "unknown"}
目前頁面可見文字節錄：
${pageText?.trim().slice(0, 4500) || "未提供"}
`,
      },
      ...normalizedMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI response did not contain output_text.");
  }

  return outputText.trim();
}
