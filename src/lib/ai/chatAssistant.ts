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
      content: message.content.trim().slice(0, 2000),
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

  const normalizedMessages = normalizeMessages(messages).slice(-10);

  if (normalizedMessages.length === 0) {
    throw new Error("No question provided.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: getModel(),
    max_output_tokens: 900,
    input: [
      {
        role: "system",
        content: `
你是 Nihongo Sense Lab 的日文 N1 學習助教。
回答規則：
- 主要使用繁體中文說明，必要時穿插日文。
- 回答要短而有用，優先給學習者可立即使用的說明。
- 若使用者問日文表達，請說明語感、使用場景、近義差異與自然例句。
- 若使用者問目前頁面的內容，可參考提供的頁面文字，但不要假裝知道未提供的資訊。
- 不要輸出冗長講義；需要時用 2 到 5 個重點。
目前頁面路徑：${pagePath || "unknown"}
目前頁面可見文字節錄：
${pageText?.trim().slice(0, 5000) || "未提供"}
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
