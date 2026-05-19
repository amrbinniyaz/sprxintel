"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  ListChecks,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/schools", label: "Schools", icon: GraduationCap },
  { href: "/jobs", label: "Crawl Jobs", icon: ListChecks },
  { href: "/chat", label: "LLM Chat", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 h-screen w-[260px] shrink-0 border-r border-border bg-sidebar/85 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2.5 px-6 pt-7 pb-8">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-[var(--primary-2)] text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_18px_-6px_rgba(99,102,241,0.55)]">
            <Sparkles size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-[15px] font-semibold leading-tight tracking-tight text-sidebar-foreground">
              SprXintel
            </div>
            <div className="text-[11px] text-muted-foreground">
              School Intelligence
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            const cls = cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              "text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground",
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              item.disabled && "pointer-events-none opacity-50",
            );
            return (
              <Link key={item.href} href={item.href} className={cls}>
                <Icon size={16} className={cn(active && "text-primary")} />
                <span>{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto rounded bg-[var(--card-2)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 pb-6 pt-4">
          <div className="rounded-lg border border-border bg-[var(--card-2)] p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              MVP Build
            </div>
            <div className="mt-1 font-mono text-[12px] text-[var(--foreground-soft)]">
              v0.1.0 · local
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
