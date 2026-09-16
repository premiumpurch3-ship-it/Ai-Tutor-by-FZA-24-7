"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  ListChecks,
  Layers,
  CalendarClock,
  LineChart,
  CreditCard,
  ShieldCheck,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/tutor", label: "AI Tutor", icon: MessageCircle },
  { href: "/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/study-plans", label: "Study Plans", icon: CalendarClock },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-[var(--surface)] p-4 md:flex">
      <Link href="/" className="flex items-center gap-2 px-2 py-2 font-semibold text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)]">
          <GraduationCap size={18} />
        </div>
        AI Tutor
      </Link>

      <nav className="mt-6 flex-1 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              <link.icon size={18} />
              {link.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/admin") ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
            )}
          >
            <ShieldCheck size={18} />
            Admin
          </Link>
        )}
      </nav>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Log out
        </button>
      </form>
    </aside>
  );
}
