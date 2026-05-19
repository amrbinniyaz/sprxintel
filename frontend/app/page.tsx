"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  FileText,
  FileStack,
  Activity,
  Clock,
  ArrowRight,
  Globe,
} from "lucide-react";
import { api, Stats, School, Job } from "@/lib/api";
import {
  Card,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  EmptyState,
  Badge,
} from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StartCrawlCard } from "@/components/start-crawl";
import { Sparkline } from "@/components/sparkline";
import { Favicon } from "@/components/favicon";
import { NoSchools, NoJobs } from "@/components/illustrations";
import { fmtMs, fmtNum, fmtRel } from "@/lib/utils";

const POLL_MS = 1500;

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const [s, sc, j] = await Promise.all([
        api.stats(),
        api.schools(),
        api.jobs(),
      ]);
      setStats(s);
      setSchools(sc);
      setJobs(j);
      setErr(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    const run = () => {
      void load();
    };
    const first = window.setTimeout(run, 0);
    const t = window.setInterval(run, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);

  const activeJobs = jobs.filter((j) => j.status === "running");

  return (
    <div className="stagger space-y-8">
      <header>
        <div className="flex items-end justify-between gap-4">
          <div>
            <Greeting />
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              <span className="text-foreground">School </span>
              <span className="text-gradient-primary">Intelligence</span>
              <span className="text-foreground"> Platform</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Crawl, store, and explore school websites — pilot MVP for the SprXintel program.
            </p>
          </div>
          {stats && stats.active_jobs > 0 && (
            <Badge tone="live" className="h-7 px-2.5 text-[12px]">
              {stats.active_jobs} crawl{stats.active_jobs > 1 ? "s" : ""} live
            </Badge>
          )}
        </div>
        <div className="divider-fade mt-7" />
      </header>

      {err && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          API error: {err} — is the backend running on{" "}
          <span className="font-mono">:8765</span>?
        </Card>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats ? (
          <>
            <StatCard
              label="Schools"
              value={fmtNum(stats.total_schools)}
              numericValue={stats.total_schools}
              formatNumber={(n) => fmtNum(Math.round(n))}
              hint="crawled or in progress"
              icon={<GraduationCap size={18} />}
              accent="violet"
              series={placeholderSeries(stats.total_schools)}
            />
            <StatCard
              label="Pages"
              value={fmtNum(stats.total_pages)}
              numericValue={stats.total_pages}
              formatNumber={(n) => fmtNum(Math.round(n))}
              hint={`avg ${stats.avg_pages_per_school} / school`}
              icon={<FileText size={18} />}
              accent="cyan"
              series={placeholderSeries(stats.total_pages)}
            />
            <StatCard
              label="Documents"
              value={fmtNum(stats.total_docs)}
              numericValue={stats.total_docs}
              formatNumber={(n) => fmtNum(Math.round(n))}
              hint="PDFs + linked docs"
              icon={<FileStack size={18} />}
              accent="green"
              series={placeholderSeries(stats.total_docs)}
            />
            <StatCard
              label="Last crawl"
              value={fmtMs(stats.last_crawl_ms)}
              hint={
                stats.active_jobs > 0
                  ? `${stats.active_jobs} active now`
                  : "ready"
              }
              icon={<Clock size={18} />}
              accent="amber"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        )}
      </section>

      <StartCrawlCard />

      {activeJobs.length > 0 && (
        <section>
          <SectionHeading title="Live crawls" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeJobs.map((j) => (
              <LiveJobCard
                key={j.id}
                job={j}
                school={schools.find((s) => s.id === j.school_id)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionHeading title="Schools" inline />
          <Link
            href="/schools"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {schools.length === 0 ? (
          <EmptyState
            title="No schools yet"
            hint="Kick off your first crawl using the form above."
            illustration={<NoSchools className="h-full w-full" />}
          />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <Th>School</Th>
                  <Th>Status</Th>
                  <Th align="right">Pages</Th>
                  <Th align="right">Docs</Th>
                  <Th>Last crawl</Th>
                  <Th align="right"></Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.slice(0, 8).map((s) => (
                  <TableRow
                    key={s.id}
                    className="group relative bg-transparent transition-all duration-150 hover:bg-gradient-to-r hover:from-[var(--surface-hover)] hover:via-[var(--surface-hover)] hover:to-transparent hover:shadow-[inset_2px_0_0_var(--primary)]"
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Favicon domain={s.domain} />
                        <div className="min-w-0">
                          <Link
                            href={`/schools/${s.id}`}
                            className="block truncate font-medium text-foreground transition-colors group-hover:text-primary"
                          >
                            {s.name || s.domain}
                          </Link>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.domain}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={s.crawl_status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {fmtNum(s.total_pages)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {fmtNum(s.total_docs)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {fmtRel(s.last_crawled)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Link
                        href={`/schools/${s.id}`}
                        className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-hover:underline"
                      >
                        Open →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionHeading title="Recent crawl jobs" inline />
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            hint="Once you kick off a crawl, recent runs appear here."
            illustration={<NoJobs className="h-full w-full" />}
          />
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {jobs.slice(0, 5).map((j) => {
                const sch = schools.find((s) => s.id === j.school_id);
                return (
                  <div
                    key={j.id}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Activity size={14} className="text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {sch?.name || sch?.domain || `school ${j.school_id}`}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {fmtNum(j.pages_crawled)} pages · {fmtMs(j.duration_ms)}
                          {j.pages_failed > 0
                            ? ` · ${j.pages_failed} failures`
                            : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={j.status} />
                      <Link
                        href={`/schools/${j.school_id}?job=${j.id}`}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function Greeting() {
  const h = new Date().getHours();
  const part =
    h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return (
    <div suppressHydrationWarning className="text-xs font-medium text-muted-foreground">
      {part} &mdash; here&apos;s the latest on your crawls.
    </div>
  );
}

function SectionHeading({
  title,
  inline,
}: {
  title: string;
  inline?: boolean;
}) {
  return (
    <h2
      className={`${inline ? "" : "mb-3"} text-[11px] font-medium uppercase tracking-wider text-muted-foreground`}
    >
      {title}
    </h2>
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

function LiveJobCard({ job, school }: { job: Job; school?: School }) {
  const pct = (job.pages_crawled / Math.max(job.max_pages, 1)) * 100;
  const series = usePagesPerSecSeries(job.pages_crawled, 30);

  return (
    <Card className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">
            {school?.name || school?.domain || `school ${job.school_id}`}
          </div>
          <BrowserBar url={job.current_url} className="mt-2" />
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-4 flex items-end justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">
            {fmtNum(job.pages_crawled)}
          </span>{" "}
          / <span className="tabular-nums">{fmtNum(job.max_pages)}</span> pages ·
          queue <span className="tabular-nums">{fmtNum(job.queue_size)}</span>
        </span>
        <span className="font-medium tabular-nums text-[var(--foreground-soft)]">
          {Math.round(pct)}%
        </span>
      </div>

      <div className="relative mt-2">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-y-1 -inset-x-2 rounded-full blur-md"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 35%, transparent) ${pct}%, transparent ${pct + 4}%)`,
            opacity: 0.6,
          }}
        />
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--card-2)] ring-1 ring-inset ring-border">
          <div
            className="shimmer h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {series.length >= 2 && (
        <div className="mt-3 flex items-center gap-2">
          <Sparkline data={series} className="h-6 flex-1" stroke="var(--primary)" />
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {(series[series.length - 1] ?? 0).toFixed(1)} p/s
          </span>
        </div>
      )}
    </Card>
  );
}

function BrowserBar({ url, className }: { url: string | null | undefined; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md bg-[var(--card-2)] px-2 py-1 ring-1 ring-inset ring-border ${className ?? ""}`}
    >
      <div className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-border-strong" />
        <span className="size-1.5 rounded-full bg-border-strong" />
        <span className="size-1.5 rounded-full bg-border-strong" />
      </div>
      <Globe size={11} className="text-muted-foreground" />
      <span className="truncate font-mono text-[11px] text-[var(--foreground-soft)]">
        {url || "Discovering URLs…"}
      </span>
    </div>
  );
}

// Placeholder series for stat-card sparklines — synthesised from current value.
// TODO(backend): replace with real 14-day rolling history endpoint.
function placeholderSeries(current: number): number[] | undefined {
  if (!current || current < 2) return undefined;
  const n = 14;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = current * (0.55 + 0.45 * t);
    const wobble = current * 0.06 * Math.sin(i * 1.3);
    out.push(Math.max(0, base + wobble));
  }
  return out;
}

type Sample = { t: number; v: number };

// Tracks recent pages_crawled deltas locally to derive a pages/sec sparkline.
// Uses the React "adjust state during render" pattern to record props history.
function usePagesPerSecSeries(pagesCrawled: number, maxPoints: number): number[] {
  const [prevPages, setPrevPages] = useState<number>(pagesCrawled);
  const [samples, setSamples] = useState<Sample[]>(() => [
    { t: Date.now(), v: pagesCrawled },
  ]);

  if (prevPages !== pagesCrawled) {
    setPrevPages(pagesCrawled);
    setSamples((s) => {
      const next = [...s, { t: Date.now(), v: pagesCrawled }];
      while (next.length > maxPoints + 1) next.shift();
      return next;
    });
  }

  const series: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const dv = samples[i].v - samples[i - 1].v;
    const dtSec = Math.max(0.001, (samples[i].t - samples[i - 1].t) / 1000);
    series.push(Math.max(0, dv / dtSec));
  }
  return series;
}
