import OpenAI from "openai";

export type ArticleAnalysis = {
  difficulty_level: "N2" | "N1" | "Advanced";
  difficulty_score: number;
  summary_ja: string;
  summary_zh: string;
  sentences: {
    index: number;
    text: string;
    structure_note: string;
    grammar_note: string;
  }[];
  expressions: {
    expression: string;
    reading: string;
    meaning_zh: string;
    meaning_ja: string;
    expression_type:
      | "word"
      | "collocation"
      | "grammar"
      | "phrase"
      | "sentence_pattern";
    jlpt_level: "N2" | "N1" | "Above N1";
    register: "news" | "formal" | "academic" | "business" | "casual";
    nuance_note: string;
    original_sentence: string;
    similar_expressions: {
      expression: string;
      difference: string;
    }[];
    collocations: {
      pattern: string;
      example: string;
    }[];
  }[];
};

const articleAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "difficulty_level",
    "difficulty_score",
    "summary_ja",
    "summary_zh",
    "sentences",
    "expressions",
  ],
  properties: {
    difficulty_level: {
      type: "string",
      enum: ["N2", "N1", "Advanced"],
    },
    difficulty_score: {
      type: "number",
      description: "0 to 100. Higher means more difficult.",
    },
    summary_ja: {
      type: "string",
      description: "A short Japanese summary, within 2 sentences.",
    },
    summary_zh: {
      type: "string",
      description: "A short Traditional Chinese summary, within 2 sentences.",
    },
    sentences: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      description:
        "Analyze only the 1 to 3 most educationally valuable sentences.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "text", "structure_note", "grammar_note"],
        properties: {
          index: {
            type: "number",
          },
          text: {
            type: "string",
          },
          structure_note: {
            type: "string",
            description: "Keep it concise. Traditional Chinese.",
          },
          grammar_note: {
            type: "string",
            description: "Keep it concise. Traditional Chinese.",
          },
        },
      },
    },
    expressions: {
      type: "array",
      minItems: 5,
      maxItems: 6,
      description:
        "Pick only 5 to 6 high-value N1-N2 expressions. Avoid basic vocabulary.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "expression",
          "reading",
          "meaning_zh",
          "meaning_ja",
          "expression_type",
          "jlpt_level",
          "register",
          "nuance_note",
          "original_sentence",
          "similar_expressions",
          "collocations",
        ],
        properties: {
          expression: {
            type: "string",
          },
          reading: {
            type: "string",
          },
          meaning_zh: {
            type: "string",
          },
          meaning_ja: {
            type: "string",
          },
          expression_type: {
            type: "string",
            enum: [
              "word",
              "collocation",
              "grammar",
              "phrase",
              "sentence_pattern",
            ],
          },
          jlpt_level: {
            type: "string",
            enum: ["N2", "N1", "Above N1"],
          },
          register: {
            type: "string",
            enum: ["news", "formal", "academic", "business", "casual"],
          },
          nuance_note: {
            type: "string",
            description:
              "One concise Traditional Chinese explanation of nuance.",
          },
          original_sentence: {
            type: "string",
          },
          similar_expressions: {
            type: "array",
            maxItems: 1,
            description:
              "At most one similar expression. Use empty array if unnecessary.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["expression", "difference"],
              properties: {
                expression: {
                  type: "string",
                },
                difference: {
                  type: "string",
                },
              },
            },
          },
          collocations: {
            type: "array",
            maxItems: 1,
            description:
              "At most one useful collocation. Use empty array if unnecessary.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["pattern", "example"],
              properties: {
                pattern: {
                  type: "string",
                },
                example: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

type AnalyzeJapaneseArticleInput = {
  title: string;
  content: string;
};

export async function analyzeJapaneseArticle({
  title,
  content,
}: AnalyzeJapaneseArticleInput): Promise<ArticleAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const response = await client.responses.create({
    model,
    max_output_tokens: 3000,
    input: `
你是一位 JLPT N1-N2 高階日文教師、語感分析專家與第二語言習得教練。

請分析以下日文文章，並輸出符合 JSON schema 的結果。

重要限制：
1. 不要抽 N5-N3 的基礎單字。
2. 只抽 5 到 6 個最值得學的高階表達。
3. 每個表達的說明要短，不要寫成長篇教科書。
4. 句子分析只選 1 到 3 句最有學習價值的句子。
5. similar_expressions 每個表達最多 1 個，沒有就給空陣列。
6. collocations 每個表達最多 1 個，沒有就給空陣列。
7. summary_ja 與 summary_zh 都控制在 2 句以內。
8. 說明請使用繁體中文。

優先抽取：
- N1-N2 高階單字
- 抽象名詞
- 新聞、評論、商業、學術常用表達
- 搭配詞 collocation
- 可用於輸出的句型
- 有語氣差異的表達

文章標題：
${title}

文章內容：
${content}
`,
    text: {
      format: {
        type: "json_schema",
        name: "article_analysis_fast",
        strict: true,
        schema: articleAnalysisSchema,
      },
    },
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI response did not contain output_text.");
  }

  return JSON.parse(outputText) as ArticleAnalysis;
}