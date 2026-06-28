import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/articles", label: "文章庫" },
  { href: "/articles/new", label: "新增文章" },
  { href: "/vocab", label: "語彙庫" },
  { href: "/review", label: "複習" },
  { href: "/output", label: "輸出" },
];

export default function AppNav() {
  return (
    <nav className="mb-8 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-teal-700 transition hover:text-teal-900"
        >
          Nihongo Sense Lab
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
