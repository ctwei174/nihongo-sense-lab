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
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafd] px-6 text-[#172033]">
      <div className="w-full max-w-md rounded-2xl border border-[#d8dee9] bg-white p-8 shadow-xl shadow-[#e8edf5]">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#52648f]">
            Nihongo Sense Lab
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            N1 精讀與輸出訓練室
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#59667a]">
            專為高階學習者設計，把日文文章轉成主旨理解、語彙筆記、間隔複習與造句批改。
          </p>
        </div>

        <a
          href="/auth/login"
          className="block w-full rounded-lg bg-[#52648f] px-4 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-[#42537c]"
        >
          使用 Google 登入
        </a>

        <p className="mt-5 text-xs leading-5 text-[#728096]">
          Google 登入僅用於身份驗證。目前不會讀取 Gmail、Google Drive 或其他 Google 私人資料。
        </p>
      </div>
    </main>
  );
}
