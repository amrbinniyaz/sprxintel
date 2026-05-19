"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { api, Job, School } from "@/lib/api";
import { Card, StatusBadge, EmptyState, Badge } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Favicon } from "@/components/favicon";
import { NoJobs } from "@/components/illustrations";
import { fmtMs, fmtNum, fmtRel } from "@/lib/utils";

type Filter = "all" | "running" | "done" | "failed";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [j, s] = await Promise.all([api.jobs(), api.schools()]);
        setJobs(j);
        setSchools(s);
      } catch {
        // transient — keep last known state, retry on next tick
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, []);

  const counts = useMemo(() => {
    const out = { all: jobs.length, running: 0, done: 0, failed: 0 };
    for (const j of jobs) {
      if (j.status === "running") out.running++;
      else if (j.status === "done") out.done++;
      else if (j.status === "failed") out.failed++;
    }
    return out;
  }, [jobs]);

  const filtered = useMemo(
    () => (filter === "all" ? jobs : jobs.filter((j) => j.status === filter)),
    [jobs, filter],
  );

  return (
    <div className="stagger space-y-7">
      <header>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pipeline
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              <span className="text-foreground">Crawl </span>
              <span className="text-gradient-primary">Jobs</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every crawl run, live progress, and failure breakdown — auto-refreshing.
            </p>
          </div>
          {counts.running > 0 && (
            <Badge tone="live" className="h-7 px-2.5 text-[12px]">
              {counts.running} live
            </Badge>
          )}
        </div>
        <div className="divider-fade mt-6" />
      </header>

      <FilterTabs filter={filter} setFilter={setFilter} counts={counts} />

      {loading ? (
        <JobsTableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No jobs yet" : `No ${filter} jobs`}
          hint={
            filter === "all"
              ? "Once you kick off a crawl, runs land here."
              : "Switch the filter above to see other states."
          }
          illustration={<NoJobs className="h-full w-full" />}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <Th>#</Th>
                <Th>School</Th>
                <Th>Status</Th>
                <Th>Progress</Th>
                <Th align="right">Failed</Th>
                <Th align="right">Docs</Th>
                <Th align="right">Duration</Th>
                <Th>Created</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => {
                const sch = schools.find((s) => s.id === j.school_id);
                const pct = (j.pages_crawled / Math.max(j.max_pages, 1)) * 100;
                const isRunning = j.status === "running";
                return (
                  <TableRow
                    key={j.id}
                    className="group relative bg-transparent transition-all duration-150 hover:bg-gradient-to-r hover:from-[var(--surface-hover)] hover:via-[var(--surface-hover)] hover:to-transparent hover:shadow-[inset_2px_0_0_var(--primary)]"
                  >
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{j.id}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Favicon domain={sch?.domain} />
                        <div className="min-w-0">
                          <Link
                            href={`/schools/${j.school_id}?job=${j.id}`}
                            className="block truncate font-medium text-foreground transition-colors group-hover:text-primary"
                          >
                            {sch?.name || sch?.domain || `school ${j.school_id}`}
                          </Link>
                          {isRunning && j.current_url && (
                            <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded bg-[var(--card-2)] px-1.5 py-0.5 ring-1 ring-inset ring-border">
                              <Globe size={10} className="shrink-0 text-muted-foreground" />
                              <span className="truncate font-mono text-[10px] text-[var(--foreground-soft)]">
                                {j.current_url}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <ProgressInline
                        crawled={j.pages_crawled}
                        max={j.max_pages}
                        pct={pct}
                        live={isRunning}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {j.pages_failed > 0 ? (
                        <span className="text-destructive">{j.pages_failed}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {j.docs_found}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground">
                      {isRunning ? "—" : fmtMs(j.duration_ms)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {fmtRel(j.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function FilterTabs({
  filter,
  setFilter,
  counts,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: { all: number; running: number; done: number; failed: number };
}) {
  const tabs: ReadonlyArray<{ key: Filter; label: string; n: number }> = [
    { key: "all", label: "All", n: counts.all },
    { key: "running", label: "Running", n: counts.running },
    { key: "done", label: "Done", n: counts.done },
    { key: "failed", label: "Failed", n: counts.failed },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-xs)]">
      {tabs.map((t) => {
        const active = filter === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              active
                ? "bg-[var(--primary-soft)] text-primary shadow-[inset_0_0_0_1px_rgba(99,102,241,0.18)]"
                : "text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`tabular-nums ${active ? "text-primary/80" : "text-muted-foreground/70"}`}
            >
              {t.n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProgressInline({
  crawled,
  max,
  pct,
  live,
}: {
  crawled: number;
  max: number;
  pct: number;
  live: boolean;
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-1">
      <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums">
        <span className="text-foreground">
          {fmtNum(crawled)}
          <span className="text-muted-foreground"> / {fmtNum(max)}</span>
        </span>
        <span className="text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--card-2)] ring-1 ring-inset ring-border">
        <div
          className={live ? "shimmer h-full rounded-full" : "h-full rounded-full bg-[color-mix(in_oklab,var(--primary)_55%,transparent)]"}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <TableHead
      className={`px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </TableHead>
  );
}

function JobsTableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border">
        <div className="grid grid-cols-[60px_1fr_100px_180px_80px_80px_100px_120px] gap-4 px-4 py-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-full max-w-[70%] animate-pulse rounded bg-[var(--card-2)] ring-1 ring-inset ring-border"
            />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[60px_1fr_100px_180px_80px_80px_100px_120px] items-center gap-4 px-4 py-3"
          >
            <div className="h-3 w-10 animate-pulse rounded bg-[var(--card-2)]" />
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 shrink-0 animate-pulse rounded-sm bg-[var(--card-2)] ring-1 ring-inset ring-border" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--card-2)]" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded bg-[var(--card-2)]" />
            <div className="space-y-1">
              <div className="h-2.5 w-full animate-pulse rounded bg-[var(--card-2)]" />
              <div className="h-1 w-full animate-pulse rounded bg-[var(--card-2)]" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-full max-w-[70%] animate-pulse rounded bg-[var(--card-2)]" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
