import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AnalyzeArticleButton from "./AnalyzeArticleButton";
import AppNav from "@/components/AppNav";
import { analyzeJapaneseArticle } from "@/lib/ai/analyzeArticle";
import { createClient } from "@/lib/supabase/server";

type ArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    analysis_error?: string;
  }>;
};

type Collocation = {
  pattern: string;
  example: string;
};

type SimilarExpression = {
  expression: string;
  difference: string;
};

type Expression = {
  id: string;
  expression: string;
  reading: string | null;
  meaning_zh: string | null;
  meaning_ja: string | null;
  expression_type: string | null;
  jlpt_level: string | null;
  register: string | null;
  nuance_note: string | null;
  original_sentence: string | null;
  similar_expressions: SimilarExpression[] | null;
  collocations: Collocation[] | null;
  is_saved: boolean | null;
};

function getAnalysisErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Missing OPENAI_API_KEY")) {
    return "Vercel 尚未設定 OPENAI_API_KEY，請到 Environment Variables 補上後重新部署。";
  }

  if (message.includes("model_not_found") || message.includes("does not exist")) {
    return "OPENAI_MODEL 可能不存在或此 API key 無權使用，請在 Vercel Environment Variables 改成可用模型後重新部署。";
  }

  if (message.includes("insufficient_quota")) {
    return "OpenAI API 額度不足，請確認 billing 或換用有額度的 API key。";
  }

  return "AI 精讀解析失敗，請稍後再試，或檢查 Vercel Function Logs。";
}

async function analyzeArticleAction(formData: FormData) {
  "use server";

  const articleId = String(formData.get("article_id") ?? "").trim();

  if (!articleId) {
    throw new Error("Missing article_id.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .single();

  if (articleError || !article) {
    throw new Error("Article not found.");
  }

  if (article.content.length > 6000) {
    redirect(
      `/articles/${article.id}?analysis_error=${encodeURIComponent(
        "文章太長，請先縮短到 6000 字以內再解析。",
      )}`,
    );
  }

  let analysis;

  try {
    analysis = await analyzeJapaneseArticle({
      title: article.title,
      content: article.content,
    });
  } catch (error) {
    redirect(
      `/articles/${article.id}?analysis_error=${encodeURIComponent(
        getAnalysisErrorMessage(error),
      )}`,
    );
  }

  const { error: updateArticleError } = await supabase
    .from("articles")
    .update({
      difficulty_level: analysis.difficulty_level,
      difficulty_score: analysis.difficulty_score,
      ai_summary_ja: analysis.summary_ja,
      ai_summary_zh: analysis.summary_zh,
    })
    .eq("id", article.id)
    .eq("user_id", user.id);

  if (updateArticleError) {
    redirect(
      `/articles/${article.id}?analysis_error=${encodeURIComponent(
        updateArticleError.message,
      )}`,
    );
  }

  await supabase.from("article_sentences").delete().eq("article_id", article.id);
  await supabase
    .from("expressions")
    .delete()
    .eq("article_id", article.id)
    .eq("user_id", user.id);

  const sentenceRows = analysis.sentences.map((sentence, index) => ({
    article_id: article.id,
    sentence_index: sentence.index || index + 1,
    sentence_text: sentence.text,
    structure_note: sentence.structure_note,
    grammar_note: sentence.grammar_note,
  }));

  if (sentenceRows.length > 0) {
    const { error } = await supabase.from("article_sentences").insert(sentenceRows);

    if (error) {
      redirect(
        `/articles/${article.id}?analysis_error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }
  }

  const expressionRows = analysis.expressions.map((item, index) => ({
    user_id: user.id,
    article_id: article.id,
    expression_index: index + 1,
    expression: item.expression,
    reading: item.reading,
    meaning_zh: item.meaning_zh,
    meaning_ja: item.meaning_ja,
    expression_type: item.expression_type,
    jlpt_level: item.jlpt_level,
    register: item.register,
    nuance_note: item.nuance_note,
    original_sentence: item.original_sentence,
    similar_expressions: item.similar_expressions,
    collocations: item.collocations,
    is_saved: false,
  }));

  if (expressionRows.length > 0) {
    const { error } = await supabase.from("expressions").insert(expressionRows);

    if (error) {
      redirect(
        `/articles/${article.id}?analysis_error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }
  }

  revalidatePath(`/articles/${article.id}`);
  revalidatePath("/vocab");
  revalidatePath("/dashboard");
  redirect(`/articles/${article.id}`);
}

async function toggleSaveExpressionAction(formData: FormData) {
  "use server";

  const expressionId = String(formData.get("expression_id") ?? "").trim();
  const articleId = String(formData.get("article_id") ?? "").trim();
  const nextSavedValue = String(formData.get("next_saved_value") ?? "") === "true";

  if (!expressionId || !articleId) {
    throw new Error("Missing expression_id or article_id.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("expressions")
    .update({
      is_saved: nextSavedValue,
    })
    .eq("id", expressionId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/articles/${articleId}`);
  revalidatePath("/vocab");
  revalidatePath("/dashboard");
  redirect(`/articles/${articleId}`);
}

export default async function ArticleDetailPage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const analysisError = resolvedSearchParams?.analysis_error;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !article) {
    notFound();
  }

  const { data: sentences } = await supabase
    .from("article_sentences")
    .select("*")
    .eq("article_id", id)
    .order("sentence_index", { ascending: true });

  const { data: expressions } = await supabase
    .from("expressions")
    .select("*")
    .eq("article_id", id)
    .eq("user_id", user.id)
    .order("expression_index", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const sentenceList = sentences ?? [];
  const expressionList = (expressions ?? []) as Expression[];
  const hasAnalysis =
    Boolean(article.ai_summary_ja) ||
    sentenceList.length > 0 ||
    expressionList.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <article className="mx-auto max-w-5xl">
        <AppNav />

        <header className="mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link href="/articles" className="text-sm text-slate-400 hover:text-white">
              ← 回文章庫
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/vocab"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                語彙筆記庫
              </Link>

              <Link
                href="/articles/new"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                匯入素材
              </Link>
            </div>
          </div>

          <p className="text-sm text-slate-400">精讀素材</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-400">
            {article.topic && (
              <span className="rounded-full bg-slate-800 px-3 py-1">
                {article.topic}
              </span>
            )}

            {article.difficulty_level && (
              <span className="rounded-full bg-blue-950 px-3 py-1 text-blue-200">
                {article.difficulty_level}
                {article.difficulty_score
                  ? ` / ${Math.round(article.difficulty_score)}`
                  : ""}
              </span>
            )}

            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-slate-800 px-3 py-1 hover:bg-slate-700"
              >
                來源連結
              </a>
            )}

            <span className="rounded-full bg-slate-800 px-3 py-1">
              {new Date(article.created_at).toLocaleString("zh-TW")}
            </span>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {analysisError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {analysisError}
            </div>
          )}

          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-200">原文</h2>

            <form action={analyzeArticleAction}>
              <input type="hidden" name="article_id" value={article.id} />
              <AnalyzeArticleButton hasAnalysis={hasAnalysis} />
            </form>
          </div>

          <div className="whitespace-pre-wrap leading-8 text-slate-200">
            {article.content}
          </div>
        </section>

        {article.ai_summary_ja && (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold">日文要約</h2>
              <p className="mt-3 leading-7 text-slate-300">
                {article.ai_summary_ja}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold">中文理解摘要</h2>
              <p className="mt-3 leading-7 text-slate-300">
                {article.ai_summary_zh}
              </p>
            </div>
          </section>
        )}

        {expressionList.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">N1 高階表達</h2>
                <p className="mt-2 text-sm text-slate-400">
                  從文章脈絡中挑出的表達、搭配、語域與語感差異，可收藏後複習與輸出。
                </p>
              </div>

              <Link
                href="/vocab"
                className="whitespace-nowrap rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                查看語彙筆記
              </Link>
            </div>

            <div className="mt-6 grid gap-4">
              {expressionList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold">{item.expression}</h3>

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

                    <form action={toggleSaveExpressionAction}>
                      <input type="hidden" name="article_id" value={article.id} />
                      <input
                        type="hidden"
                        name="expression_id"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="next_saved_value"
                        value={item.is_saved ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={
                          item.is_saved
                            ? "rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900"
                            : "rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                        }
                      >
                        {item.is_saved ? "已加入筆記" : "加入筆記"}
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">中文理解</p>
                      <p className="mt-1 text-slate-200">{item.meaning_zh}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">日文語義</p>
                      <p className="mt-1 text-slate-200">{item.meaning_ja}</p>
                    </div>
                  </div>

                  {item.nuance_note && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-500">語感與使用限制</p>
                      <p className="mt-1 leading-7 text-slate-300">
                        {item.nuance_note}
                      </p>
                    </div>
                  )}

                  {item.original_sentence && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-500">原文脈絡</p>
                      <p className="mt-1 leading-7 text-slate-300">
                        {item.original_sentence}
                      </p>
                    </div>
                  )}

                  {Array.isArray(item.collocations) &&
                    item.collocations.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-500">搭配模式</p>
                        <div className="mt-2 space-y-2">
                          {item.collocations.map((collocation, index) => (
                            <div
                              key={`${item.id}-collocation-${index}`}
                              className="rounded-xl bg-slate-900 p-3"
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
                      <div className="mt-4">
                        <p className="text-sm text-slate-500">近義語比較</p>
                        <div className="mt-2 space-y-2">
                          {item.similar_expressions.map((similar, index) => (
                            <div
                              key={`${item.id}-similar-${index}`}
                              className="rounded-xl bg-slate-900 p-3"
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
              ))}
            </div>
          </section>
        )}

        {sentenceList.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">句構與文法解析</h2>

            <div className="mt-6 space-y-4">
              {sentenceList.map((sentence) => (
                <div
                  key={sentence.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <p className="text-sm text-slate-500">
                    第 {sentence.sentence_index} 句
                  </p>

                  <p className="mt-2 leading-8 text-slate-200">
                    {sentence.sentence_text}
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">句構</p>
                      <p className="mt-1 leading-7 text-slate-300">
                        {sentence.structure_note}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">文法</p>
                      <p className="mt-1 leading-7 text-slate-300">
                        {sentence.grammar_note}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!hasAnalysis && (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">尚未建立精讀解析</h2>
            <p className="mt-3 text-slate-400">
              按下「開始 AI 精讀」後，系統會產生日文要約、中文理解摘要、句構解析與可收藏的 N1 表達。
            </p>
          </section>
        )}
      </article>
    </main>
  );
}
