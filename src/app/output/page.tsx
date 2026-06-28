import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { checkJapaneseOutput } from "@/lib/ai/checkOutput";

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
  created_at: string;
};

type OutputSubmission = {
  id: string;
  expression_id: string | null;
  submission_text: string;
  ai_score: number | null;
  grammar_feedback: string | null;
  nuance_feedback: string | null;
  collocation_feedback: string | null;
  suggested_revision: string | null;
  overall_feedback: string | null;
  created_at: string;
};

async function submitOutputAction(formData: FormData) {
  "use server";

  const expressionId = String(formData.get("expression_id") ?? "").trim();
  const submissionText = String(formData.get("submission_text") ?? "").trim();

  if (!expressionId) {
    throw new Error("Missing expression_id.");
  }

  if (!submissionText) {
    throw new Error("請先輸入日文造句。");
  }

  if (submissionText.length > 1000) {
    throw new Error("造句內容太長。P0 階段請控制在 1000 字以內。");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: expression, error: expressionError } = await supabase
    .from("expressions")
    .select(
      `
      id,
      expression,
      reading,
      meaning_zh,
      nuance_note,
      original_sentence
    `
    )
    .eq("id", expressionId)
    .eq("user_id", user.id)
    .eq("is_saved", true)
    .single();

  if (expressionError || !expression) {
    throw new Error("Expression not found.");
  }

  const feedback = await checkJapaneseOutput({
    expression: expression.expression,
    reading: expression.reading,
    meaningZh: expression.meaning_zh,
    nuanceNote: expression.nuance_note,
    originalSentence: expression.original_sentence,
    submissionText,
  });

  const { error: insertError } = await supabase
    .from("output_submissions")
    .insert({
      user_id: user.id,
      expression_id: expression.id,
      submission_text: submissionText,
      ai_score: feedback.score,
      grammar_feedback: feedback.grammar_feedback,
      nuance_feedback: feedback.nuance_feedback,
      collocation_feedback: feedback.collocation_feedback,
      suggested_revision: feedback.suggested_revision,
      overall_feedback: feedback.overall_feedback,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/output");
  revalidatePath("/dashboard");
  redirect("/output");
}

export default async function OutputPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: expressions, error: expressionError } = await supabase
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
      created_at
    `
    )
    .eq("user_id", user.id)
    .eq("is_saved", true)
    .order("created_at", { ascending: false });

  if (expressionError) {
    throw new Error(expressionError.message);
  }

  const savedExpressions = (expressions ?? []) as SavedExpression[];

  const expressionIds = savedExpressions.map((item) => item.id);

  const latestSubmissionMap: Record<string, OutputSubmission> = {};

  if (expressionIds.length > 0) {
    const { data: submissions, error: submissionError } = await supabase
      .from("output_submissions")
      .select(
        `
        id,
        expression_id,
        submission_text,
        ai_score,
        grammar_feedback,
        nuance_feedback,
        collocation_feedback,
        suggested_revision,
        overall_feedback,
        created_at
      `
      )
      .eq("user_id", user.id)
      .in("expression_id", expressionIds)
      .order("created_at", { ascending: false });

    if (submissionError) {
      throw new Error(submissionError.message);
    }

    for (const submission of (submissions ?? []) as OutputSubmission[]) {
      if (!submission.expression_id) {
        continue;
      }

      if (!latestSubmissionMap[submission.expression_id]) {
        latestSubmissionMap[submission.expression_id] = submission;
      }
    }
  }

  const { count: outputCount } = await supabase
    .from("output_submissions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <AppNav />

        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Nihongo Sense Lab</p>
            <h1 className="mt-2 text-3xl font-bold">輸出批改</h1>
            <p className="mt-3 text-slate-400">
              選擇語彙筆記中的高階表達，寫出自己的日文句子，讓 AI 檢查文法、搭配、語氣與自然度。
            </p>
          </div>

          <Link
            href="/vocab"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            回語彙筆記庫
          </Link>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">可練習表達</p>
            <p className="mt-2 text-3xl font-bold">
              {savedExpressions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">累積批改</p>
            <p className="mt-2 text-3xl font-bold">{outputCount ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">訓練目標</p>
            <p className="mt-2 text-lg font-medium">被動理解 → 主動使用</p>
          </div>
        </section>

        {savedExpressions.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">目前還沒有可輸出的表達</h2>
            <p className="mt-3 text-slate-400">
              先在文章精讀頁把想主動使用的 N1 表達加入語彙筆記，再回來造句。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/articles"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                前往精讀文章庫
              </Link>

              <Link
                href="/vocab"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                前往語彙筆記庫
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-5">
            {savedExpressions.map((item) => {
              const latestSubmission = latestSubmissionMap[item.id];

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
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

                      <p className="mt-3 text-slate-300">
                        {item.meaning_zh ?? "—"}
                      </p>
                    </div>

                    {item.article_id && (
                      <Link
                        href={`/articles/${item.article_id}`}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                      >
                        回到原文
                      </Link>
                    )}
                  </div>

                  {item.nuance_note && (
                    <div className="mt-5 rounded-xl bg-slate-950 p-4">
                      <p className="text-sm text-slate-500">語感與使用限制</p>
                      <p className="mt-2 leading-7 text-slate-300">
                        {item.nuance_note}
                      </p>
                    </div>
                  )}

                  {item.original_sentence && (
                    <div className="mt-4 rounded-xl bg-slate-950 p-4">
                      <p className="text-sm text-slate-500">原文脈絡</p>
                      <p className="mt-2 leading-7 text-slate-300">
                        {item.original_sentence}
                      </p>
                    </div>
                  )}

                  <form action={submitOutputAction} className="mt-5 space-y-4">
                    <input type="hidden" name="expression_id" value={item.id} />

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        使用「{item.expression}」寫一個自然句
                      </label>

                      <textarea
                        name="submission_text"
                        rows={4}
                        required
                        placeholder={`例：${item.expression} を使って、自分の文を書いてください。`}
                        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                    >
                      送出 AI 批改
                    </button>
                  </form>

                  {latestSubmission && (
                    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">最近一次回饋</h3>

                        {typeof latestSubmission.ai_score === "number" && (
                          <span className="rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-200">
                            {Math.round(latestSubmission.ai_score)} / 100
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-slate-500">你的輸出</p>
                        <p className="mt-1 leading-7 text-slate-300">
                          {latestSubmission.submission_text}
                        </p>
                      </div>

                      {latestSubmission.suggested_revision && (
                        <div className="mt-4">
                          <p className="text-sm text-slate-500">自然改寫</p>
                          <p className="mt-1 leading-7 text-emerald-200">
                            {latestSubmission.suggested_revision}
                          </p>
                        </div>
                      )}

                      {latestSubmission.grammar_feedback && (
                        <div className="mt-4">
                          <p className="text-sm text-slate-500">文法回饋</p>
                          <p className="mt-1 leading-7 text-slate-300">
                            {latestSubmission.grammar_feedback}
                          </p>
                        </div>
                      )}

                      {latestSubmission.collocation_feedback && (
                        <div className="mt-4">
                          <p className="text-sm text-slate-500">搭配回饋</p>
                          <p className="mt-1 leading-7 text-slate-300">
                            {latestSubmission.collocation_feedback}
                          </p>
                        </div>
                      )}

                      {latestSubmission.nuance_feedback && (
                        <div className="mt-4">
                          <p className="text-sm text-slate-500">語氣與自然度</p>
                          <p className="mt-1 leading-7 text-slate-300">
                            {latestSubmission.nuance_feedback}
                          </p>
                        </div>
                      )}

                      {latestSubmission.overall_feedback && (
                        <div className="mt-4">
                          <p className="text-sm text-slate-500">總評</p>
                          <p className="mt-1 leading-7 text-slate-300">
                            {latestSubmission.overall_feedback}
                          </p>
                        </div>
                      )}
                    </section>
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
            ← 回概覽
          </Link>

          <Link
            href="/review"
            className="text-sm text-slate-400 hover:text-white"
          >
            前往間隔複習
          </Link>
        </div>
      </div>
    </main>
  );
}
