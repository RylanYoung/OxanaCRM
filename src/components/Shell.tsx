"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { isConfigured } from "@/lib/supabase";
import { todayISO } from "@/lib/dates";
import { AuthGate } from "./AuthGate";
import { Skeleton, modalsOpen } from "./ui";
import { Logo } from "./Logo";

const NAV = [
  { href: "/",          label: "Dashboard", icon: "◎" },
  { href: "/weekly",    label: "Week Log",  icon: "▦" },
  { href: "/pipeline",  label: "Pipeline",  icon: "▤" },
  { href: "/accounts",  label: "Accounts",  icon: "◫" },
  { href: "/contacts",  label: "Contacts",  icon: "☺" },
  { href: "/tasks",     label: "Follow-ups",icon: "✓" },
  { href: "/settings",  label: "Settings",  icon: "⚙" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, session, tasks, toasts } = useStore();
  const path = usePathname();

  // Safety net: navigation is client-side, so a scroll lock left behind by a
  // modal would follow the user from page to page with no reload to clear it.
  // If we land on a route with nothing open, make sure the body can scroll.
  useEffect(() => {
    if (modalsOpen() === 0 && document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }
  }, [path]);

  // Badge on the Follow-ups tab: anything open and due today or earlier.
  const dueCount = useMemo(
    () => tasks.filter((t) => t.status === "open" && t.due_date <= todayISO()).length,
    [tasks]
  );

  if (!ready) {
    return (
      <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-16 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!isConfigured || !session) return <AuthGate />;

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <div className="min-h-screen lg:flex">
      {/* ---------------------------------------------------------- sidebar */}
      <aside
        className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen
                   lg:sticky lg:top-0 border-r border-ink-800 px-4 py-6 gap-1"
      >
        <Link href="/" className="flex items-center px-2 mb-7 focus-ring rounded-xl">
          <Logo size={24} tagline />
        </Link>

        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`focus-ring flex items-center gap-3.5 rounded-xl px-3.5 h-13 text-lg
              font-semibold transition-colors
              ${isActive(n.href)
                ? "bg-brand/18 text-white border border-brand/40"
                : "text-ink-300 hover:bg-ink-800 hover:text-ink-100 border border-transparent"}`}
          >
            <span className="text-xl w-6 text-center opacity-80">{n.icon}</span>
            <span className="grow">{n.label}</span>
            {n.href === "/tasks" && dueCount > 0 && (
              <span className="tnum min-w-7 h-7 px-2 rounded-full bg-red-500 text-white
                               text-sm font-bold flex items-center justify-center">
                {dueCount}
              </span>
            )}
          </Link>
        ))}
      </aside>

      {/* ------------------------------------------------------------- main */}
      <main className="grow min-w-0 pb-28 lg:pb-10">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-7 lg:py-10">{children}</div>
      </main>

      {/* ------------------------------------------------------ mobile tabs */}
      <nav
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-700
                   bg-ink-900/95 backdrop-blur-xl
                   pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 px-1"
      >
        <div className="flex justify-around">
          {NAV.slice(0, 6).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`focus-ring relative flex flex-col items-center gap-0.5 rounded-xl
                px-2 py-2 min-w-[3.6rem]
                ${isActive(n.href) ? "text-brand-bright" : "text-ink-400"}`}
            >
              <span className="text-2xl leading-none">{n.icon}</span>
              <span className="text-[0.68rem] font-semibold">{n.label}</span>
              {n.href === "/tasks" && dueCount > 0 && (
                <span className="absolute top-0.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* ----------------------------------------------------------- toasts */}
      <div className="no-print fixed z-[60] bottom-24 lg:bottom-6 right-5 flex flex-col gap-2.5 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pop card px-5 py-4 text-base font-semibold shadow-2xl shadow-black/60
              max-w-sm ${t.tone === "err"
                ? "border-red-500/50 text-red-200"
                : "border-emerald-500/40 text-emerald-100"}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
