import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";

export default async function ArticlesPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, topic, source_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const articleList = articles ?? [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <AppNav />

        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Nihongo Sense Lab</p>
            <h1 className="mt-2 text-3xl font-bold">精讀文章庫</h1>
            <p className="mt-3 text-slate-400">
              保存新聞、評論、社論或小說片段，進入文章頁後可進行 N1 級 AI 精讀解析。
            </p>
          </div>

          <Link
            href="/articles/new"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            匯入素材
          </Link>
        </header>

        <section className="space-y-4">
          {articleList.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
              目前還沒有文章。先匯入一篇日文素材，建立你的第一份精讀筆記。
            </div>
          ) : (
            articleList.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{article.title}</h2>

                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-400">
                      {article.topic && (
                        <span className="rounded-full bg-slate-800 px-3 py-1">
                          {article.topic}
                        </span>
                      )}

                      {article.source_url && (
                        <span className="rounded-full bg-slate-800 px-3 py-1">
                          有來源 URL
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="whitespace-nowrap text-sm text-slate-500">
                    {new Date(article.created_at).toLocaleDateString("zh-TW")}
                  </p>
                </div>
              </Link>
            ))
          )}
        </section>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← 回概覽
          </Link>
        </div>
      </div>
    </main>
  );
}
