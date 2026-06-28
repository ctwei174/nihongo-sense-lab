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
    quoteJa: "雨ニモマケズ 風ニモマケズ",
    quoteZh: "不輸給雨，也不輸給風。",
    author: "宮沢 賢治",
    workTitle: "雨ニモマケズ",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000081/card45630.html",
    level: "N2",
    theme: "忍耐",
    expressionFocus: "Nにも負けず",
    explanationZh:
      "「Nにも負けず」表示即使面對某種壓力或困難也不屈服。可用來寫決心、習慣或長期目標。",
    outputPrompt:
      "請用「Nにも負けず」寫一句日文，描述你學日文時想克服的一件事。",
  },
  {
    quoteJa: "智に働けば角が立つ。情に棹させば流される。",
    quoteZh: "只憑理智會與人衝突；只任情感推動又會隨波逐流。",
    author: "夏目 漱石",
    workTitle: "草枕",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card776.html",
    level: "N1",
    theme: "平衡",
    expressionFocus: "Vば / Nに働く",
    explanationZh:
      "這句把兩種極端並列，適合學習「Vば」條件句，以及抽象名詞搭配動詞的文學式表達。",
    outputPrompt:
      "請用「Vば」寫兩個對比句，描述理性與感情之間的平衡。",
  },
  {
    quoteJa: "吾輩は猫である。名前はまだ無い。",
    quoteZh: "我是貓。還沒有名字。",
    author: "夏目 漱石",
    workTitle: "吾輩は猫である",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000148/card789.html",
    level: "N2",
    theme: "視角",
    expressionFocus: "まだ + 否定",
    explanationZh:
      "「まだ無い」不是單純的沒有，而是帶有「到目前為止尚未」的時間感。很適合練習狀態尚未成立的說法。",
    outputPrompt:
      "請用「まだ + 否定」寫一句日文，描述你目前還沒做到、但想達成的學習目標。",
  },
  {
    quoteJa: "メロスは激怒した。",
    quoteZh: "梅洛斯勃然大怒。",
    author: "太宰 治",
    workTitle: "走れメロス",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000035/card1567.html",
    level: "N2",
    theme: "感情",
    expressionFocus: "感情を表す漢語動詞",
    explanationZh:
      "「激怒する」比「怒る」更書面、更強烈。學習漢語動詞能讓輸出更精準，也更接近評論或敘事文體。",
    outputPrompt:
      "請用一個漢語動詞寫一句日文，表達強烈情緒，例如「感動する」「後悔する」「緊張する」。",
  },
  {
    quoteJa: "ある日の事でございます。",
    quoteZh: "這是某一天的事。",
    author: "芥川 龍之介",
    workTitle: "蜘蛛の糸",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000879/card92.html",
    level: "N2",
    theme: "敘事開場",
    expressionFocus: "ある日 / ことでございます",
    explanationZh:
      "「ある日」能自然帶出故事開端；「ございます」讓語氣更鄭重，常見於敘事或服務場景。",
    outputPrompt:
      "請用「ある日」寫一個兩句日文小開場，描述一件意外開始的事。",
  },
  {
    quoteJa: "ほんとうのさいわいをさがしに行く。",
    quoteZh: "去尋找真正的幸福。",
    author: "宮沢 賢治",
    workTitle: "銀河鉄道の夜",
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000081/card43737.html",
    level: "N2",
    theme: "追尋",
    expressionFocus: "Vます形 + に行く",
    explanationZh:
      "「さがしに行く」表示移動的目的。這個句型很實用，可以把日常行動和抽象目標自然連起來。",
    outputPrompt:
      "請用「Vます形 + に行く」寫一句日文，描述你今天想主動去做的一件事。",
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
