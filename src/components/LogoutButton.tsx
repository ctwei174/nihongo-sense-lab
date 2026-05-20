"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
    >
      登出
    </button>
  );
}