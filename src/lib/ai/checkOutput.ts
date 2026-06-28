import OpenAI from "openai";

export type OutputCheckResult = {
  score: number;
  grammar_feedback: string;
  nuance_feedback: string;
  collocation_feedback: string;
  suggested_revision: string;
  overall_feedback: string;
};

const outputCheckSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "grammar_feedback",
    "nuance_feedback",
    "collocation_feedback",
    "suggested_revision",
    "overall_feedback",
  ],
  properties: {
    score: {
      type: "number",
      description: "0 to 100. Higher means more natural and appropriate.",
    },
    grammar_feedback: {
      type: "string",
      description: "Concise Traditional Chinese feedback.",
    },
    nuance_feedback: {
      type: "string",
      description: "Concise Traditional Chinese feedback.",
    },
    collocation_feedback: {
      type: "string",
      description: "Concise Traditional Chinese feedback.",
    },
    suggested_revision: {
      type: "string",
      description: "One natural Japanese revision.",
    },
    overall_feedback: {
      type: "string",
      description: "Concise Traditional Chinese overall comment.",
    },
  },
} as const;

type CheckJapaneseOutputInput = {
  expression: string;
  reading?: string | null;
  meaningZh?: string | null;
  nuanceNote?: string | null;
  originalSentence?: string | null;
  submissionText: string;
};

export async function checkJapaneseOutput({
  expression,
  reading,
  meaningZh,
  nuanceNote,
  originalSentence,
  submissionText,
}: CheckJapaneseOutputInput): Promise<OutputCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const response = await client.responses.create({
    model,
    max_output_tokens: 1000,
    input: `
你是一位高階日文寫作教練，專門協助 JLPT N1-N2 學習者把「看得懂的表達」轉換成「能自然使用的日文輸出」。

請批改學習者使用指定日文表達所寫的句子。

請簡潔評估：
1. 文法是否正確
2. 指定表達是否用對
3. 搭配詞是否自然
4. 語氣是否自然
5. 是否有中文直譯感
6. 如何改成更自然的日文

限制：
- 請用繁體中文回饋。
- 每個 feedback 欄位請控制在 1 到 2 句。
- suggested_revision 只給 1 句自然日文改寫。
- 不要長篇解釋。

指定表達：
${expression}

讀音：
${reading ?? "無"}

中文意思：
${meaningZh ?? "無"}

語感說明：
${nuanceNote ?? "無"}

原文例句：
${originalSentence ?? "無"}

學習者造句：
${submissionText}
`,
    text: {
      format: {
        type: "json_schema",
        name: "output_check_fast",
        strict: true,
        schema: outputCheckSchema,
      },
    },
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI response did not contain output_text.");
  }

  return JSON.parse(outputText) as OutputCheckResult;
}