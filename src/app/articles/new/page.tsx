import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";

async function createArticle(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();

  if (!title || !content) {
    throw new Error("Title and content are required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: user.id,
      title,
      content,
      source_url: sourceUrl || null,
      topic: topic || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/articles/${data.id}`);
}

export default async function NewArticlePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <AppNav />

        <header className="mb-8">
          <p className="text-sm text-slate-400">Nihongo Sense Lab</p>
          <h1 className="mt-2 text-3xl font-bold">匯入日文文章</h1>
          <p className="mt-3 text-slate-400">
            貼上想精讀的日文素材。儲存後可立即進入文章頁，讓 AI 拆解主旨、句構與高階表達。
          </p>
        </header>

        <form action={createArticle} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              標題
            </label>
            <input
              name="title"
              required
              placeholder="例：少子化が社会に与える影響"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              主題標籤，可選
            </label>
            <input
              name="topic"
              placeholder="例：社会、AI、経済、教育"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              來源網址，可選
            </label>
            <input
              name="source_url"
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              日文內容
            </label>
            <textarea
              name="content"
              required
              rows={16}
              placeholder="ここに日本語の記事、ニュース、評論文などを貼り付けてください。"
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Link
              href="/articles"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← 回文章庫
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              儲存並進入精讀
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
