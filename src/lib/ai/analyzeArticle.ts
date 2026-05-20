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
    },
    summary_zh: {
      type: "string",
    },
    sentences: {
      type: "array",
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
          },
          grammar_note: {
            type: "string",
          },
        },
      },
    },
    expressions: {
      type: "array",
      minItems: 5,
      maxItems: 15,
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
          },
          original_sentence: {
            type: "string",
          },
          similar_expressions: {
            type: "array",
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

  const client = new OpenAI({
    apiKey,
  });

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await client.responses.create({
    model,
    input: `
你是一位 JLPT N1-N2 高階日文教師、語感分析專家與第二語言習得教練。

請分析以下日文文章。目標使用者是：
- JLPT N1-N2 程度
- 已具備基本閱讀能力
- 想提升高階單字、搭配詞、文法、語感與輸出能力

請不要抽取太基礎的 N5-N3 單字。
請優先抽取：
1. N1-N2 高階單字
2. 抽象名詞
3. 新聞、評論、商業、學術常用表達
4. 搭配詞 collocation
5. 相似詞容易混淆的表達
6. 可用於輸出的句型
7. 具有語氣差異的表達

請用繁體中文解釋重點。
句子結構分析請簡潔，不要過度冗長。
expressions 請抽 8 到 12 個最值得學的表達。

文章標題：
${title}

文章內容：
${content}
`,
    text: {
      format: {
        type: "json_schema",
        name: "article_analysis",
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