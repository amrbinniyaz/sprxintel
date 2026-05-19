"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  ListChecks,
  Sparkles,
  MessageSquare,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        await api.stats();
        if (!cancelled) setHealthy(true);
      } catch {
        if (!cancelled) setHealthy(false);
      }
    };
    void ping();
    const t = window.setInterval(ping, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <aside className="sticky top-0 h-screen w-[260px] shrink-0 border-r border-border bg-sidebar/80 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-6 pt-7 pb-8">
          <div className="relative">
            <div
              aria-hidden
              className="glow-pulse pointer-events-none absolute -inset-2 rounded-xl bg-gradient-to-br from-primary/40 to-[var(--primary-2)]/30 blur-lg"
            />
            <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-[var(--primary-2)] text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_18px_-6px_rgba(99,102,241,0.55)]">
              <Sparkles size={18} strokeWidth={2.4} />
            </div>
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

        <div className="px-3 pb-3">
          <button
            type="button"
            disabled
            className="group flex w-full cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-[var(--card-2)] px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-border-strong hover:bg-card"
            title="Coming soon"
          >
            <Search size={13} />
            <span className="flex-1">Search schools, jobs…</span>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            const cls = cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              "text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground",
              active && [
                "bg-sidebar-accent text-sidebar-accent-foreground",
                "shadow-[inset_0_0_0_1px_rgba(99,102,241,0.18),0_0_24px_-12px_var(--primary)]",
                "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-r before:bg-gradient-to-b before:from-primary before:to-[var(--primary-2)]",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ],
              item.disabled && "pointer-events-none opacity-50",
            );
            return (
              <Link key={item.href} href={item.href} className={cls}>
                <Icon size={16} className={cn("transition-colors", active && "text-primary")} />
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

        <div className="px-4 pb-5 pt-4">
          <div className="card-top-light rounded-xl border border-border p-3 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                MVP Build
              </div>
              <HealthDot healthy={healthy} />
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

function HealthDot({ healthy }: { healthy: boolean | null }) {
  const color =
    healthy === true
      ? "var(--success)"
      : healthy === false
        ? "var(--destructive)"
        : "var(--muted-soft)";
  const label =
    healthy === true
      ? "Backend healthy"
      : healthy === false
        ? "Backend unreachable"
        : "Checking backend…";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
      title={label}
    >
      <span
        className={cn("size-1.5 rounded-full", healthy === true && "pulse-dot")}
        style={{
          background: color,
          boxShadow: healthy === true ? `0 0 8px ${color}` : "none",
        }}
      />
      {healthy === true ? "Online" : healthy === false ? "Offline" : "…"}
    </span>
  );
}
