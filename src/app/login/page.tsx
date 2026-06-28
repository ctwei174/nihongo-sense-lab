import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-100">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Nihongo Sense Lab
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            高階日文學習系統
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            專為 N1-N2 學習者設計，將文章輸入轉換成可複習、可輸出、可吸收的學習素材。
          </p>
        </div>

        <a
          href="/auth/login"
          className="block w-full rounded-lg bg-teal-700 px-4 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          使用 Google 登入
        </a>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Google 登入僅用於身份驗證。目前不會讀取 Gmail、Google Drive 或其他 Google 私人資料。
        </p>
      </div>
    </main>
  );
}
