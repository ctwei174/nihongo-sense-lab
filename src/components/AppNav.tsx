"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const navItems = [
  { href: "/dashboard", label: "概覽", match: ["/dashboard"] },
  { href: "/articles", label: "文章", match: ["/articles"] },
  { href: "/vocab", label: "語彙", match: ["/vocab"] },
  { href: "/review", label: "複習", match: ["/review"] },
  { href: "/output", label: "輸出", match: ["/output"] },
];

function isActive(pathname: string, matchers: string[]) {
  return matchers.some((matcher) => pathname.startsWith(matcher));
}

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-3 z-20 mb-8 rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-slate-950 transition hover:text-teal-700"
        >
          Nihongo Sense Lab
        </Link>

        <div className="flex flex-wrap items-center gap-1 rounded-full bg-stone-100 p-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.match);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/articles/new"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 hover:text-slate-950"
          >
            新增文章
          </Link>

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
