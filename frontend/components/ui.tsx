"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import {
  Card as ShadcnCard,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { Progress as ShadcnProgress } from "@/components/ui/progress";
import { Skeleton as ShadcnSkeleton } from "@/components/ui/skeleton";

export {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
};

/* ---------- Card (flattened wrapper) ---------- */
export function Card({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnCard>) {
  return (
    <ShadcnCard
      className={cn(
        "gap-0 py-0 ring-1 ring-border bg-card shadow-[var(--shadow-sm)] transition-shadow duration-200",
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Button (legacy variant names) ---------- */
type LegacyVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = Omit<
  React.ComponentProps<typeof ShadcnButton>,
  "variant"
> & {
  variant?: LegacyVariant;
  onClick?: () => void;
  type?: "button" | "submit";
};

const PRIMARY =
  "bg-gradient-to-br from-primary to-[var(--primary-2)] text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_18px_-6px_rgba(99,102,241,0.45)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_12px_24px_-6px_rgba(99,102,241,0.55)] hover:brightness-[1.03]";

export function Button({
  variant = "primary",
  className,
  children,
  size = "default",
  ...props
}: ButtonProps) {
  const v =
    variant === "primary"
      ? "default"
      : variant === "danger"
        ? "destructive"
        : variant === "secondary"
          ? "outline"
          : "ghost";
  return (
    <ShadcnButton
      variant={v}
      size={size}
      className={cn(variant === "primary" && PRIMARY, "h-9 px-3.5", className)}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}

/* ---------- Input (controlled-string wrapper) ---------- */
export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <ShadcnInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={cn("h-9", className)}
    />
  );
}

/* ---------- Badge (with our tones) ---------- */
type Tone = "default" | "success" | "warning" | "danger" | "info" | "live";

const TONE_CLASS: Record<Tone, string> = {
  default:
    "bg-[var(--card-2)] text-[var(--foreground-soft)] ring-1 ring-inset ring-border",
  success:
    "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-[var(--success)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--success)_28%,transparent)]",
  warning:
    "bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] text-[var(--warning)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--warning)_28%,transparent)]",
  danger:
    "bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] text-[var(--destructive)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--destructive)_25%,transparent)]",
  info:
    "bg-[color-mix(in_oklab,var(--cyan)_12%,transparent)] text-[var(--cyan)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--cyan)_28%,transparent)]",
  live:
    "bg-[var(--primary-soft)] text-primary ring-1 ring-inset ring-[color-mix(in_oklab,var(--primary)_25%,transparent)]",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <ShadcnBadge
      variant="outline"
      className={cn(
        "h-5 gap-1.5 rounded-md border-transparent px-2 text-[11px] font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {tone === "live" && (
        <span className="pulse-dot inline-block size-1.5 rounded-full bg-primary" />
      )}
      {children}
    </ShadcnBadge>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <ShadcnSkeleton
      className={cn(
        "rounded-md bg-[var(--card-2)] ring-1 ring-inset ring-border",
        className,
      )}
    />
  );
}

/* ---------- Progress ---------- */
export function Progress({
  value,
  max = 100,
  live = false,
  className,
}: {
  value: number;
  max?: number;
  live?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  if (live) {
    return (
      <div
        className={cn(
          "h-1.5 w-full overflow-hidden rounded-full bg-[var(--card-2)] ring-1 ring-inset ring-border",
          className,
        )}
      >
        <div className="shimmer h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    );
  }
  return <ShadcnProgress value={pct} className={cn("h-1.5", className)} />;
}

/* ---------- Status Badge ---------- */
export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Badge tone="live">Running</Badge>;
    case "done":
      return <Badge tone="success">Done</Badge>;
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    case "pending":
      return <Badge tone="warning">Pending</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

/* ---------- Stat Card ---------- */
type Accent = "violet" | "cyan" | "green" | "amber";

const ACCENT_BG: Record<Accent, string> = {
  violet: "from-[color-mix(in_oklab,var(--primary)_10%,transparent)] to-transparent",
  cyan: "from-[color-mix(in_oklab,var(--cyan)_10%,transparent)] to-transparent",
  green: "from-[color-mix(in_oklab,var(--success)_10%,transparent)] to-transparent",
  amber: "from-[color-mix(in_oklab,var(--warning)_10%,transparent)] to-transparent",
};

const ACCENT_ICON: Record<Accent, string> = {
  violet:
    "bg-[var(--primary-soft)] text-primary ring-1 ring-[color-mix(in_oklab,var(--primary)_18%,transparent)]",
  cyan:
    "bg-[color-mix(in_oklab,var(--cyan)_10%,transparent)] text-[var(--cyan)] ring-1 ring-[color-mix(in_oklab,var(--cyan)_18%,transparent)]",
  green:
    "bg-[color-mix(in_oklab,var(--success)_10%,transparent)] text-[var(--success)] ring-1 ring-[color-mix(in_oklab,var(--success)_18%,transparent)]",
  amber:
    "bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] text-[var(--warning)] ring-1 ring-[color-mix(in_oklab,var(--warning)_18%,transparent)]",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: Accent;
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow duration-200 hover:shadow-[var(--shadow-md)]">
      {accent && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b",
            ACCENT_BG[accent],
          )}
        />
      )}
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105",
              accent ? ACCENT_ICON[accent] : "bg-[var(--card-2)] text-muted-foreground ring-1 ring-border",
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Empty State ---------- */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="grid place-items-center p-14 text-center">
      <div>
        <div className="text-base font-medium text-foreground">{title}</div>
        {hint && <div className="mt-1 text-sm text-muted-foreground">{hint}</div>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Card>
  );
}
