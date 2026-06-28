import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import {
  getFallbackDailyQuote,
  getTodayDate,
  type DailyQuote,
} from "@/lib/dailyQuote";
import { createClient } from "@/lib/supabase/server";

type DailyQuoteRow = {
  quote_ja: string;
  quote_zh: string | null;
  author: string | null;
  work_title: string | null;
  source_name: string | null;
  source_url: string | null;
  level: "N2" | "N1" | "Advanced" | null;
  theme: string | null;
  expression_focus: string | null;
  explanation_zh: string | null;
  output_prompt: string | null;
  display_date: string | null;
};

function mapDailyQuote(row: DailyQuoteRow, fallback: DailyQuote): DailyQuote {
  return {
    quoteJa: row.quote_ja,
    quoteZh: row.quote_zh ?? fallback.quoteZh,
    author: row.author ?? fallback.author,
    workTitle: row.work_title ?? fallback.workTitle,
    sourceName: row.source_name ?? fallback.sourceName,
    sourceUrl: row.source_url ?? fallback.sourceUrl,
    level: row.level ?? fallback.level,
    theme: row.theme ?? fallback.theme,
    expressionFocus: row.expression_focus ?? fallback.expressionFocus,
    explanationZh: row.explanation_zh ?? fallback.explanationZh,
    outputPrompt: row.output_prompt ?? fallback.outputPrompt,
    displayDate: row.display_date ?? fallback.displayDate,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();
  const today = getTodayDate();
  let dailyQuote = getFallbackDailyQuote(today);

  const { data: quoteData } = await supabase
    .from("daily_quotes")
    .select(
      `
        quote_ja,
        quote_zh,
        author,
        work_title,
        source_name,
        source_url,
        level,
        theme,
        expression_focus,
        explanation_zh,
        output_prompt,
        display_date
      `,
    )
    .eq("display_date", today)
    .maybeSingle<DailyQuoteRow>();

  if (quoteData?.level === "N1" || quoteData?.level === "Advanced") {
    dailyQuote = mapDailyQuote(quoteData, dailyQuote);
  }

  const { count: articleCount } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: savedExpressionCount } = await supabase
    .from("expressions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_saved", true);

  const { count: dueReviewCount } = await supabase
    .from("review_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("next_review_at", nowIso);

  const { count: outputCount } = await supabase
    .from("output_submissions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const stats = [
    { label: "精讀文章", value: articleCount ?? 0 },
    { label: "收藏表達", value: savedExpressionCount ?? 0 },
    { label: "待複習", value: dueReviewCount ?? 0 },
    { label: "批改紀錄", value: outputCount ?? 0 },
  ];

  const actions = [
    {
      href: "/articles/new",
      title: "匯入素材",
      description: "貼上或上傳文章、單字表與文句筆記，轉成可精讀、可保存、可輸出的學習素材。",
    },
    {
      href: "/articles",
      title: "精讀文章庫",
      description: "回到已解析的文章，重看主旨、句構、文法與上下文中的自然搭配。",
    },
    {
      href: "/vocab",
      title: "語彙筆記庫",
      description: "整理收藏的 N1 表達，確認讀音、語域、語感、近義比較與搭配模式。",
    },
    {
      href: "/review",
      title: "間隔複習",
      description: "用辨識、回想、搭配與造句卡，把被動理解逐步變成長期記憶。",
    },
    {
      href: "/output",
      title: "輸出批改",
      description: "用收藏表達造句，取得 AI 對文法、搭配、語氣與自然度的回饋。",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8fafd] px-6 py-10 text-[#172033]">
      <div className="mx-auto max-w-6xl">
        <AppNav />

        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#52648f]">
              Nihongo Sense Lab
            </p>
            <h1 className="mt-2 text-3xl font-bold">今日學習工作台</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#59667a]">
              先讀一則 N1 級佳句暖身，再進入精讀、語彙保存、間隔複習與輸出批改。
            </p>
          </div>

        </header>

        <section className="rounded-2xl border border-[#d8dee9] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#59667a]">
                <span>{dailyQuote.displayDate}</span>
                <span className="rounded-full bg-[#edf2ff] px-2 py-1 font-medium text-[#425a8c]">
                  {dailyQuote.level}
                </span>
                <span className="rounded-full bg-[#eef3f8] px-2 py-1 font-medium text-[#475569]">
                  {dailyQuote.theme}
                </span>
              </div>

              <blockquote className="mt-5 text-2xl font-semibold leading-relaxed text-[#172033] md:text-3xl">
                {dailyQuote.quoteJa}
              </blockquote>

              <p className="mt-3 text-base leading-7 text-[#475569]">
                {dailyQuote.quoteZh}
              </p>

              <p className="mt-4 text-sm text-[#59667a]">
                {dailyQuote.author}《{dailyQuote.workTitle}》 ·{" "}
                <a
                  href={dailyQuote.sourceUrl}
                  className="font-medium text-[#52648f] underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {dailyQuote.sourceName}
                </a>
              </p>
            </div>

            <div className="w-full border-t border-[#d8dee9] pt-5 lg:max-w-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#52648f]">
                Focus
              </p>
              <p className="mt-2 text-lg font-semibold">
                {dailyQuote.expressionFocus}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#475569]">
                {dailyQuote.explanationZh}
              </p>
              <div className="mt-5 rounded-lg border border-[#d8dee9] bg-[#f8fafd] p-4">
                <p className="text-xs font-medium text-[#52648f]">
                  今日輸出任務
                </p>
                <p className="mt-2 text-sm leading-6 text-[#475569]">
                  {dailyQuote.outputPrompt}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[#24324b]">
            學習概況
          </h2>

          <div className="rounded-xl border border-[#d8dee9] bg-white shadow-sm">
            <div className="grid gap-px bg-[#d8dee9] sm:grid-cols-2 lg:grid-cols-5">
              <div className="bg-white px-4 py-3 sm:col-span-2 lg:col-span-1">
                <p className="text-xs text-slate-500">目前帳號</p>
                <p className="mt-1 truncate text-sm font-semibold text-[#172033]">
                  {user.email}
                </p>
              </div>

              {stats.map((item) => (
                <div key={item.label} className="bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold leading-none text-[#172033]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-[#24324b]">
            學習流程
          </h2>

          <div className="grid gap-4 md:grid-cols-5">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-[#d8dee9] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#bcc7d8] hover:bg-[#f3f6fb] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#172033]">
                    {action.title}
                  </h2>
                  <span className="shrink-0 rounded-full border border-[#d8dee9] bg-white px-2 py-1 text-xs font-medium text-[#59667a] transition group-hover:border-[#bcc7d8] group-hover:bg-[#eef3f8]">
                    前往
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#59667a]">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
