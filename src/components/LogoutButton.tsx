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
      className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
    >
      登出
    </button>
  );
}
