import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateNextReview, type ReviewRating } from "@/lib/srs";

type Collocation = {
  pattern?: string;
  example?: string;
};

type SavedExpression = {
  id: string;
  expression: string;
  reading: string | null;
  meaning_zh: string | null;
  meaning_ja: string | null;
  original_sentence: string | null;
  collocations: Collocation[] | null;
};

type ReviewCard = {
  id: string;
  expression_id: string;
  card_type: "recognition" | "recall" | "collocation" | "production";
  prompt: string;
  answer: string | null;
  next_review_at: string | null;
  interval_days: number | null;
  ease: number | null;
  created_at: string;
};

type ExpressionInfo = {
  id: string;
  expression: string;
  reading: string | null;
  meaning_zh: string | null;
  jlpt_level: string | null;
  expression_type: string | null;
  original_sentence: string | null;
};

function buildReviewCardsForExpression(expression: SavedExpression, userId: string) {
  const collocations = Array.isArray(expression.collocations)
    ? expression.collocations
    : [];

  const firstCollocation = collocations[0];

  return [
    {
      user_id: userId,
      expression_id: expression.id,
      card_type: "recognition",
      prompt: `「${expression.expression}」的中文意思是什麼？`,
      answer: expression.meaning_zh ?? "",
    },
    {
      user_id: userId,
      expression_id: expression.id,
      card_type: "recall",
      prompt: `看到中文「${expression.meaning_zh ?? "此表達"}」時，請回想日文表達。`,
      answer: expression.expression,
    },
    {
      user_id: userId,
      expression_id: expression.id,
      card_type: "collocation",
      prompt: `請回想「${expression.expression}」的常見搭配或原句。`,
      answer:
        firstCollocation?.pattern ??
        expression.original_sentence ??
        expression.expression,
    },
    {
      user_id: userId,
      expression_id: expression.id,
      card_type: "production",
      prompt: `請用「${expression.expression}」造一句自然的日文句子。`,
      answer: `自由造句。可參考原句：${expression.original_sentence ?? "無原句"}`,
    },
  ];
}

async function syncReviewCardsAction() {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: savedExpressions, error: expressionError } = await supabase
    .from("expressions")
    .select(
      `
      id,
      expression,
      reading,
      meaning_zh,
      meaning_ja,
      original_sentence,
      collocations
    `
    )
    .eq("user_id", user.id)
    .eq("is_saved", true);

  if (expressionError) {
    throw new Error(expressionError.message);
  }

  const expressions = (savedExpressions ?? []) as SavedExpression[];

  if (expressions.length === 0) {
    revalidatePath("/review");
    redirect("/review");
  }

  const { data: existingCards, error: cardError } = await supabase
    .from("review_cards")
    .select("expression_id, card_type")
    .eq("user_id", user.id);

  if (cardError) {
    throw new Error(cardError.message);
  }

  const existingKeySet = new Set(
    (existingCards ?? []).map(
      (card) => `${card.expression_id}:${card.card_type}`
    )
  );

  const cardsToInsert = expressions
    .flatMap((expression) => buildReviewCardsForExpression(expression, user.id))
    .filter(
      (card) => !existingKeySet.has(`${card.expression_id}:${card.card_type}`)
    );

  if (cardsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("review_cards")
      .insert(cardsToInsert);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  revalidatePath("/review");
  revalidatePath("/dashboard");
  redirect("/review");
}

async function submitReviewAction(formData: FormData) {
  "use server";

  const cardId = String(formData.get("card_id") ?? "").trim();
  const rating = String(formData.get("rating") ?? "").trim() as ReviewRating;

  if (!cardId) {
    throw new Error("Missing card_id.");
  }

  if (!["again", "hard", "good", "easy"].includes(rating)) {
    throw new Error("Invalid rating.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: card, error: cardError } = await supabase
    .from("review_cards")
    .select("id, interval_days, ease")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    throw new Error("Review card not found.");
  }

  const schedule = calculateNextReview({
    rating,
    currentIntervalDays: card.interval_days,
    currentEase: card.ease,
  });

  const { error: logError } = await supabase.from("review_logs").insert({
    user_id: user.id,
    card_id: card.id,
    rating,
    is_correct: rating !== "again",
  });

  if (logError) {
    throw new Error(logError.message);
  }

  const { error: updateError } = await supabase
    .from("review_cards")
    .update({
      next_review_at: schedule.nextReviewAt,
      interval_days: schedule.intervalDays,
      ease: schedule.ease,
    })
    .eq("id", card.id)
    .eq("user_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/review");
  revalidatePath("/dashboard");
  redirect("/review");
}

function getCardTypeLabel(cardType: ReviewCard["card_type"]) {
  switch (cardType) {
    case "recognition":
      return "辨識";
    case "recall":
      return "回想";
    case "collocation":
      return "搭配";
    case "production":
      return "造句";
    default:
      return cardType;
  }
}

export default async function ReviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  const { data: cards, error: cardError } = await supabase
    .from("review_cards")
    .select(
      `
      id,
      expression_id,
      card_type,
      prompt,
      answer,
      next_review_at,
      interval_days,
      ease,
      created_at
    `
    )
    .eq("user_id", user.id)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(20);

  if (cardError) {
    throw new Error(cardError.message);
  }

  const dueCards = (cards ?? []) as ReviewCard[];

  const expressionIds = Array.from(
    new Set(dueCards.map((card) => card.expression_id))
  );

  let expressionMap: Record<string, ExpressionInfo> = {};

  if (expressionIds.length > 0) {
    const { data: expressions, error: expressionError } = await supabase
      .from("expressions")
      .select(
        `
        id,
        expression,
        reading,
        meaning_zh,
        jlpt_level,
        expression_type,
        original_sentence
      `
      )
      .in("id", expressionIds)
      .eq("user_id", user.id);

    if (expressionError) {
      throw new Error(expressionError.message);
    }

    expressionMap = Object.fromEntries(
      ((expressions ?? []) as ExpressionInfo[]).map((expression) => [
        expression.id,
        expression,
      ])
    );
  }

  const { count: savedExpressionCount } = await supabase
    .from("expressions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_saved", true);

  const { count: totalReviewCardCount } = await supabase
    .from("review_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Nihongo Sense Lab</p>
            <h1 className="mt-2 text-3xl font-bold">每日複習</h1>
            <p className="mt-3 text-slate-400">
              將收藏的高階表達轉成辨識、回想、搭配與造句卡，逐步進入長期記憶。
            </p>
          </div>

          <form action={syncReviewCardsAction}>
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              同步收藏表達
            </button>
          </form>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">已收藏表達</p>
            <p className="mt-2 text-3xl font-bold">
              {savedExpressionCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">複習卡總數</p>
            <p className="mt-2 text-3xl font-bold">
              {totalReviewCardCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">今日到期</p>
            <p className="mt-2 text-3xl font-bold">{dueCards.length}</p>
          </div>
        </section>

        {dueCards.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">目前沒有到期複習卡</h2>
            <p className="mt-3 text-slate-400">
              如果你剛收藏表達，請先點「同步收藏表達」，系統會自動建立複習卡。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/vocab"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                前往收藏表達庫
              </Link>

              <Link
                href="/articles"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                前往文章庫
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-4">
            {dueCards.map((card) => {
              const expression = expressionMap[card.expression_id];

              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-950 px-3 py-1 text-sm text-blue-200">
                      {getCardTypeLabel(card.card_type)}
                    </span>

                    {expression?.jlpt_level && (
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                        {expression.jlpt_level}
                      </span>
                    )}

                    {expression?.expression_type && (
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                        {expression.expression_type}
                      </span>
                    )}

                    {card.interval_days && (
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400">
                        interval {card.interval_days}d
                      </span>
                    )}
                  </div>

                  {expression && (
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold">
                        {expression.expression}
                      </h2>

                      {expression.reading && (
                        <p className="mt-1 text-sm text-slate-400">
                          {expression.reading}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl bg-slate-950 p-5">
                    <p className="text-sm text-slate-500">問題</p>
                    <p className="mt-2 text-lg leading-8 text-slate-200">
                      {card.prompt}
                    </p>
                  </div>

                  {card.answer && (
                    <details className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
                      <summary className="cursor-pointer text-sm font-medium text-slate-300">
                        顯示答案 / 參考
                      </summary>
                      <p className="mt-4 leading-7 text-slate-300">
                        {card.answer}
                      </p>

                      {expression?.original_sentence && (
                        <p className="mt-4 border-t border-slate-800 pt-4 text-sm leading-7 text-slate-400">
                          原句：{expression.original_sentence}
                        </p>
                      )}
                    </details>
                  )}

                  <form
                    action={submitReviewAction}
                    className="mt-5 flex flex-wrap gap-3"
                  >
                    <input type="hidden" name="card_id" value={card.id} />

                    <button
                      name="rating"
                      value="again"
                      className="rounded-xl border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-200 transition hover:bg-red-900"
                    >
                      Again
                    </button>

                    <button
                      name="rating"
                      value="hard"
                      className="rounded-xl border border-amber-800 bg-amber-950 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-900"
                    >
                      Hard
                    </button>

                    <button
                      name="rating"
                      value="good"
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      Good
                    </button>

                    <button
                      name="rating"
                      value="easy"
                      className="rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900"
                    >
                      Easy
                    </button>
                  </form>
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
            href="/vocab"
            className="text-sm text-slate-400 hover:text-white"
          >
            回收藏表達庫
          </Link>
        </div>
      </div>
    </main>
  );
}