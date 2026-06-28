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
      data-neutral-button
      className="rounded-lg border border-[#d8dee9] bg-white px-4 py-2 text-sm font-medium text-[#475569] shadow-sm transition hover:border-[#bcc7d8] hover:bg-[#eef3f8] hover:text-[#24324b]"
    >
      登出
    </button>
  );
}
