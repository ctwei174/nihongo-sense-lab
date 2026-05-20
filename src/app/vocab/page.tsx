import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Collocation = {
  pattern: string;
  example: string;
};

type SimilarExpression = {
  expression: string;
  difference: string;
};

type SavedExpression = {
  id: string;
  article_id: string | null;
  expression: string;
  reading: string | null;
  meaning_zh: string | null;
  meaning_ja: string | null;
  expression_type: string | null;
  jlpt_level: string | null;
  register: string | null;
  nuance_note: string | null;
  original_sentence: string | null;
  collocations: Collocation[] | null;
  similar_expressions: SimilarExpression[] | null;
  created_at: string;
};

type ArticleTitleMap = Record<string, string>;

export default async function VocabPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: expressions, error } = await supabase
    .from("expressions")
    .select(
      `
      id,
      article_id,
      expression,
      reading,
      meaning_zh,
      meaning_ja,
      expression_type,
      jlpt_level,
      register,
      nuance_note,
      original_sentence,
      collocations,
      similar_expressions,
      created_at
    `
    )
    .eq("user_id", user.id)
    .eq("is_saved", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const savedExpressions = (expressions ?? []) as SavedExpression[];

  const articleIds = Array.from(
    new Set(
      savedExpressions
        .map((item) => item.article_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let articleTitleMap: ArticleTitleMap = {};

  if (articleIds.length > 0) {
    const { data: articles, error: articleError } = await supabase
      .from("articles")
      .select("id, title")
      .in("id", articleIds)
      .eq("user_id", user.id);

    if (articleError) {
      throw new Error(articleError.message);
    }

    articleTitleMap = Object.fromEntries(
      (articles ?? []).map((article) => [article.id, article.title])
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Nihongo Sense Lab</p>
            <h1 className="mt-2 text-3xl font-bold">收藏表達庫</h1>
            <p className="mt-3 text-slate-400">
              這裡會顯示你從文章中收藏的高階單字、搭配詞、句型與語感筆記。
            </p>
          </div>

          <Link
            href="/articles"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            回文章庫
          </Link>
        </header>

        {savedExpressions.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">目前還沒有收藏表達</h2>
            <p className="mt-3 text-slate-400">
              請先到文章詳情頁，在 AI 解析出的高階表達中點擊「收藏」。
            </p>

            <Link
              href="/articles"
              className="mt-6 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              前往文章庫
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {savedExpressions.map((item) => {
              const articleTitle = item.article_id
                ? articleTitleMap[item.article_id]
                : null;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold">
                        {item.expression}
                      </h2>

                      {item.reading && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                          {item.reading}
                        </span>
                      )}

                      {item.jlpt_level && (
                        <span className="rounded-full bg-blue-950 px-3 py-1 text-sm text-blue-200">
                          {item.jlpt_level}
                        </span>
                      )}

                      {item.expression_type && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                          {item.expression_type}
                        </span>
                      )}

                      {item.register && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                          {item.register}
                        </span>
                      )}
                    </div>

                    {item.article_id && (
                      <Link
                        href={`/articles/${item.article_id}`}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                      >
                        回原文
                      </Link>
                    )}
                  </div>

                  {articleTitle && (
                    <p className="mt-3 text-sm text-slate-500">
                      來源文章：{articleTitle}
                    </p>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">中文意思</p>
                      <p className="mt-1 text-slate-200">
                        {item.meaning_zh ?? "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">日文解釋</p>
                      <p className="mt-1 text-slate-200">
                        {item.meaning_ja ?? "—"}
                      </p>
                    </div>
                  </div>

                  {item.nuance_note && (
                    <div className="mt-5">
                      <p className="text-sm text-slate-500">語感說明</p>
                      <p className="mt-1 leading-7 text-slate-300">
                        {item.nuance_note}
                      </p>
                    </div>
                  )}

                  {item.original_sentence && (
                    <div className="mt-5">
                      <p className="text-sm text-slate-500">原句</p>
                      <p className="mt-1 leading-7 text-slate-300">
                        {item.original_sentence}
                      </p>
                    </div>
                  )}

                  {Array.isArray(item.collocations) &&
                    item.collocations.length > 0 && (
                      <div className="mt-5">
                        <p className="text-sm text-slate-500">常見搭配</p>
                        <div className="mt-2 grid gap-2">
                          {item.collocations.map((collocation, index) => (
                            <div
                              key={`${item.id}-collocation-${index}`}
                              className="rounded-xl bg-slate-950 p-3"
                            >
                              <p className="font-medium text-slate-200">
                                {collocation.pattern}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-400">
                                {collocation.example}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {Array.isArray(item.similar_expressions) &&
                    item.similar_expressions.length > 0 && (
                      <div className="mt-5">
                        <p className="text-sm text-slate-500">相似表達比較</p>
                        <div className="mt-2 grid gap-2">
                          {item.similar_expressions.map((similar, index) => (
                            <div
                              key={`${item.id}-similar-${index}`}
                              className="rounded-xl bg-slate-950 p-3"
                            >
                              <p className="font-medium text-slate-200">
                                {similar.expression}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-400">
                                {similar.difference}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </section>
        )}

        <div className="mt-8 flex gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← 回 Dashboard
          </Link>

          <Link
            href="/articles"
            className="text-sm text-slate-400 hover:text-white"
          >
            回文章庫
          </Link>
        </div>
      </div>
    </main>
  );
}