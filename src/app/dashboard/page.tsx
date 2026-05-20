import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Nihongo Sense Lab</p>

            <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>

            <p className="mt-3 text-slate-400">
              目前已完成 Google 登入、文章儲存、AI 解析、收藏表達與複習卡。下一步是把輸出表現整合到學習進度。
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:col-span-1">
            <p className="text-sm text-slate-400">登入帳號</p>
            <p className="mt-2 break-all text-lg font-medium">{user.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">已儲存文章</p>
            <p className="mt-2 text-3xl font-bold">{articleCount ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">已收藏表達</p>
            <p className="mt-2 text-3xl font-bold">
              {savedExpressionCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">今日到期複習</p>
            <p className="mt-2 text-3xl font-bold">{dueReviewCount ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">造句提交</p>
            <p className="mt-2 text-3xl font-bold">{outputCount ?? 0}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <Link
            href="/articles/new"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
          >
            <h2 className="text-xl font-semibold">新增日文文章</h2>
            <p className="mt-3 text-slate-400">
              貼上新聞、評論、小說片段或學術文章，進行 AI 高階語感解析。
            </p>
          </Link>

          <Link
            href="/articles"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
          >
            <h2 className="text-xl font-semibold">查看文章庫</h2>
            <p className="mt-3 text-slate-400">
              查看你已儲存的日文文章，並進入文章詳情頁。
            </p>
          </Link>

          <Link
            href="/vocab"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
          >
            <h2 className="text-xl font-semibold">收藏表達庫</h2>
            <p className="mt-3 text-slate-400">
              查看你收藏的高階單字、搭配詞、句型與語感筆記。
            </p>
          </Link>

          <Link
            href="/review"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
          >
            <h2 className="text-xl font-semibold">每日複習</h2>
            <p className="mt-3 text-slate-400">
              將收藏表達轉成複習卡，練習辨識、回想、搭配與造句。
            </p>
          </Link>

          <Link
            href="/output"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
          >
            <h2 className="text-xl font-semibold">造句輸出</h2>
            <p className="mt-3 text-slate-400">
              用收藏表達造句，讓 AI 批改自然度、語氣、文法與搭配。
            </p>
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">P0 核心閉環</h2>
          <p className="mt-3 text-slate-400">
            文章輸入 → AI 解析 → 收藏表達 → 複習 → 造句輸出 → AI 批改。
          </p>
        </section>
      </div>
    </main>
  );
}