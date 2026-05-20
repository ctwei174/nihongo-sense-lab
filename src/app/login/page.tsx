"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      alert(error.message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8">
          <p className="text-sm text-slate-400">Nihongo Sense Lab</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            高階日文學習系統
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            專為 N1-N2 學習者設計，將文章輸入轉換成可複習、可輸出、可吸收的學習素材。
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-xl bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-200"
        >
          使用 Google 登入
        </button>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Google 登入僅用於身份驗證。目前不會讀取 Gmail、Google Drive 或其他 Google 私人資料。
        </p>
      </div>
    </main>
  );
}