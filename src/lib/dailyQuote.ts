export type DailyQuote = {
  quoteJa: string;
  quoteZh: string;
  author: string;
  workTitle: string;
  sourceName: string;
  sourceUrl: string;
  level: "N2" | "N1" | "Advanced";
  theme: string;
  expressionFocus: string;
  explanationZh: string;
  outputPrompt: string;
  displayDate?: string;
};

const fallbackQuotes: DailyQuote[] = [
  {
    quoteJa:
      "山路を登りながら、こう考えた。智に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。",
    quoteZh:
      "沿著山路往上走時，我這樣想：只憑理智行事會與人衝突；任由情感推動又會隨波逐流；堅持己見則令人窒息。",
    author: "夏目 漱石",
    workTitle: "草枕",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card776.html",
    level: "N1",
    theme: "理性與情感",
    expressionFocus: "Vば / Nに働く / Nに棹さす",
    explanationZh:
      "這段連續使用條件句，將三種處世態度並列，形成文學中常見的抽象論述。重點不只在「Vば」，也在「智に働く」「情に棹さす」這類抽象名詞與動詞的搭配，適合 N1 學習者練習把觀點寫得更凝練。",
    outputPrompt:
      "請仿照「Vば...。Vば...。Vば...。」寫三句日文，分析一個兩難處境，例如學習、工作、人際或創作。",
  },
  {
    quoteJa:
      "精神的に向上心のないものは馬鹿だ。私はこういう言葉を、今でも時々思い出します。",
    quoteZh:
      "沒有精神上進心的人是愚蠢的。直到現在，我仍不時想起這句話。",
    author: "夏目 漱石",
    workTitle: "こころ",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card773.html",
    level: "N1",
    theme: "自省",
    expressionFocus: "Nのないもの / 今でも時々思い出す",
    explanationZh:
      "「Nのないもの」可用來凝縮地評價某種缺乏；「今でも時々思い出す」則帶有回憶在現在仍持續作用的感覺。這類句型適合寫反省、價值觀與人生經驗，而不只是描述事件。",
    outputPrompt:
      "請用「Nのないものは...」和「今でも時々思い出す」各寫一句日文，主題是你對學習態度的看法。",
  },
  {
    quoteJa:
      "恥の多い生涯を送って来ました。自分には、人間の生活というものが、見当つかないのです。",
    quoteZh:
      "我度過了充滿羞恥的一生。對我而言，所謂人的生活，實在難以捉摸。",
    author: "太宰 治",
    workTitle: "人間失格",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000035/card301.html",
    level: "N1",
    theme: "自我認識",
    expressionFocus: "Nの多い / Nというもの / 見当がつかない",
    explanationZh:
      "「Nというもの」能把普通名詞提升成抽象討論的對象；「見当がつかない」表示完全抓不到方向。這段適合練習如何用簡短句子呈現高度主觀、帶陰影的心理狀態。",
    outputPrompt:
      "請用「Nというものが、見当つかない」寫一句日文，描述一件你覺得難以理解的抽象概念。",
  },
  {
    quoteJa:
      "或る日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。",
    quoteZh:
      "這是某一天傍晚的事。一名僕役正在羅生門下等待雨停。",
    author: "芥川 龍之介",
    workTitle: "羅生門",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000879/card127.html",
    level: "N1",
    theme: "敘事開端",
    expressionFocus: "或る日の暮方 / Nの下で / Vていた",
    explanationZh:
      "這段不是難在單字，而是難在敘事鏡頭的安排：時間、人物、地點、狀態依序落下，讀者立即進入場景。N1 輸出時可以學它的資訊排序，而不是只翻譯句型。",
    outputPrompt:
      "請仿照「時間 + 人物 + 場所 + Vていた」寫一個兩句日文故事開場，語氣要偏文學敘事。",
  },
  {
    quoteJa:
      "これは、余りに人を馬鹿にした話である。しかし、又、余りに人を馬鹿にしていない話でもある。",
    quoteZh:
      "這是一個太把人當傻瓜的故事。然而，它同時也並不是一個把人當傻瓜的故事。",
    author: "太宰 治",
    workTitle: "女生徒",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000035/card275.html",
    level: "N1",
    theme: "逆接與曖昧",
    expressionFocus: "余りに / しかし、又 / Aでもある",
    explanationZh:
      "「Aである。しかし、又、Bでもある」能保留矛盾，讓句子不急著下結論。這是 N1 寫作中很重要的能力：不是只表態，而是呈現事物的雙重性。",
    outputPrompt:
      "請用「Aである。しかし、又、Bでもある」寫兩句日文，描述一件你覺得矛盾但真實的事。",
  },
  {
    quoteJa:
      "過去を失うものは未来をも失う。歴史を忘れるものは、同じ過ちを繰り返す。",
    quoteZh:
      "失去過去的人，也會失去未來。忘記歷史的人，會重複同樣的錯誤。",
    author: "学習用編集句",
    workTitle: "N1 抽象表現",
    sourceName: "Nihongo Sense Lab",
    sourceUrl: "https://nihongo-sense-lab.vercel.app",
    level: "N1",
    theme: "歷史與反省",
    expressionFocus: "Nを失う / Nを忘れるものは / 同じ過ちを繰り返す",
    explanationZh:
      "這則是為 N1 輸出練習編寫的抽象論述句。重點在「ものは」帶出的普遍化語氣，以及「失う」「繰り返す」這類可用於評論、社論與作文的高頻漢語搭配。",
    outputPrompt:
      "請用「Nを忘れるものは、同じ過ちを繰り返す」改寫一句日文，主題可選語言學習、工作或人際關係。",
  },
];

export function getTodayDate(timeZone = "Asia/Taipei") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function getFallbackDailyQuote(date = getTodayDate()): DailyQuote {
  const [year, month, day] = date.split("-").map(Number);
  const dayIndex = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const quote = fallbackQuotes[dayIndex % fallbackQuotes.length];

  return {
    ...quote,
    displayDate: date,
  };
}
