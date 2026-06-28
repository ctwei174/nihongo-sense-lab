import OpenAI from "openai";

type GenerateJapaneseArticleInput = {
  title: string;
  topic?: string;
  materialType?: string;
};

function getModel() {
  const configuredModel = process.env.OPENAI_MODEL?.trim();

  if (!configuredModel || configuredModel === "gpt-5.4-mini") {
    return "gpt-4.1-mini";
  }

  return configuredModel;
}

function cleanGeneratedText(text: string) {
  return text
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function generateJapaneseArticle({
  title,
  topic,
  materialType,
}: GenerateJapaneseArticleInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const client = new OpenAI({ apiKey });
  const normalizedTitle = title.trim();
  const normalizedTopic = topic?.trim();

  const response = await client.responses.create({
    model: getModel(),
    max_output_tokens: 1800,
    input: `
あなたは日本語上級学習者向けの教材執筆者です。
以下の条件で、JLPT N1 レベルの短い日本語文章を作成してください。

条件:
- 文字数は日本語本文で 500〜1000 字。
- 見出し、Markdown、箇条書き、解説、翻訳は出力しない。
- 2〜5 段落の自然な本文だけを出力する。
- 新聞・評論・随筆の中間くらいの落ち着いた文体にする。
- N1 学習に使える抽象語、接続表現、複合表現、硬めの言い回しを自然に入れる。
- 難しすぎる専門用語だけで埋めず、文脈から意味が推測できる文章にする。
- 文章全体に主張、対比、具体例、結論があるようにする。

タイトルまたは主題:
${normalizedTitle || normalizedTopic || "現代社会と学び"}

補足テーマ:
${normalizedTopic || "指定なし"}

素材タイプ:
${materialType || "article"}
`,
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI response did not contain output_text.");
  }

  return cleanGeneratedText(outputText);
}
