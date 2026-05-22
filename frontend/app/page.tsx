"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  FileStack,
  FileText,
  GraduationCap,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, Job, School, Stats } from "@/lib/api";
import { Badge, Card, EmptyState, StatusBadge } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Favicon } from "@/components/favicon";
import { NoSchools } from "@/components/illustrations";
import { Sparkline } from "@/components/sparkline";
import { StartCrawlCard } from "@/components/start-crawl";
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

  const activeJobs = jobs.filter((job) => job.status === "running");
  const activeJob = activeJobs[0] ?? null;
  const activeSchool = activeJob
    ? schools.find((school) => school.id === activeJob.school_id)
    : undefined;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles size={13} className="text-primary" />
            Overview
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Command center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monitor crawls, inspect the school corpus, and prepare AI-assisted
            research from one focused workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StartCrawlCard />
          <StatusCluster stats={stats} />
        </div>
      </header>

      {err && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          API error: {err} — is the backend running on{" "}
          <span className="font-mono">:8765</span>?
        </Card>
      )}

      <section>
        <CommandPanel
          activeJob={activeJob}
          activeSchool={activeSchool}
          stats={stats}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SchoolsPanel schools={schools} />
        <div className="space-y-4">
          <AiBriefingCard stats={stats} schools={schools} />
          <RecentJobsCard jobs={jobs} schools={schools} />
        </div>
      </section>
    </div>
  );
}

function StatusCluster({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="h-8 w-32 animate-pulse rounded-full bg-[var(--card-2)] ring-1 ring-border" />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={stats.active_jobs > 0 ? "live" : "success"} className="h-7 px-2.5 text-[12px]">
        {stats.active_jobs > 0
          ? `${stats.active_jobs} crawl${stats.active_jobs > 1 ? "s" : ""} live`
          : "System ready"}
      </Badge>
      <Badge className="h-7 px-2.5 text-[12px]">
        Last crawl {fmtMs(stats.last_crawl_ms)}
      </Badge>
    </div>
  );
}

function CommandPanel({
  activeJob,
  activeSchool,
  stats,
}: {
  activeJob: Job | null;
  activeSchool?: School;
  stats: Stats | null;
}) {
  const pct = activeJob
    ? Math.min(100, (activeJob.pages_crawled / Math.max(activeJob.max_pages, 1)) * 100)
    : 0;

  return (
    <Card className="overflow-hidden p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Activity size={13} className="text-primary" />
            Analytics
          </div>
          <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-foreground">
            Scraped school coverage.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A clear snapshot of schools scraped, pages captured, documents
            found, crawl velocity, and live run progress.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricTile
              icon={<GraduationCap size={16} />}
              label="Schools scraped"
              value={fmtNum(stats?.total_schools)}
              sublabel="total schools"
              tone="primary"
            />
            <MetricTile
              icon={<FileText size={16} />}
              label="Pages captured"
              value={fmtNum(stats?.total_pages)}
              sublabel={stats ? `${stats.avg_pages_per_school} avg` : "indexed"}
              tone="cyan"
            />
            <MetricTile
              icon={<FileStack size={16} />}
              label="Documents"
              value={fmtNum(stats?.total_docs)}
              sublabel="linked files"
              tone="green"
            />
            <MetricTile
              icon={<Clock size={16} />}
              label="Last run"
              value={fmtMs(stats?.last_crawl_ms)}
              sublabel="duration"
              tone="amber"
            />
            <MetricTile
              icon={<Activity size={16} />}
              label="Active"
              value={fmtNum(stats?.active_jobs)}
              sublabel="running now"
              tone="primary"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-[var(--card-2)] p-4">
          {activeJob ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Live crawl
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-foreground">
                    {activeSchool?.name || activeSchool?.domain || `School ${activeJob.school_id}`}
                  </div>
                </div>
                <StatusBadge status={activeJob.status} />
              </div>

              <div className="mt-5">
                <div className="flex items-end justify-between text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">
                      {fmtNum(activeJob.pages_crawled)}
                    </span>{" "}
                    of {fmtNum(activeJob.max_pages)} pages
                  </span>
                  <span className="font-medium text-foreground">{Math.round(pct)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--primary-2)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 truncate rounded-lg border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {activeJob.current_url || "Discovering URLs..."}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Readiness
                </div>
                <ShieldCheck size={16} className="text-[var(--success)]" />
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">
                Ready for the next crawl
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Start with a school URL, then review pages, documents, and
                content gaps from the corpus.
              </p>
              <Sparkline
                data={placeholderSeries(stats?.total_pages ?? 12) ?? [2, 4, 5, 8, 13, 21]}
                className="mt-5 h-16 w-full"
                stroke="var(--primary)"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function MetricTile({
  icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  tone: "primary" | "cyan" | "green" | "amber";
}) {
  const toneClass = {
    primary: "bg-[var(--primary-soft)] text-primary",
    cyan: "bg-[color-mix(in_oklab,var(--cyan)_11%,transparent)] text-[var(--cyan)]",
    green: "bg-[color-mix(in_oklab,var(--success)_11%,transparent)] text-[var(--success)]",
    amber: "bg-[color-mix(in_oklab,var(--warning)_11%,transparent)] text-[var(--warning)]",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-[var(--card-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`grid h-7 w-7 place-items-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>
    </div>
  );
}

function SchoolsPanel({ schools }: { schools: School[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Schools
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Recently crawled properties and crawl health.
          </div>
        </div>
        <Link
          href="/schools"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:underline"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {schools.length === 0 ? (
        <EmptyState
          title="No schools yet"
          hint="Start your first crawl from the action panel."
          illustration={<NoSchools className="h-full w-full" />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <Th>School</Th>
              <Th>Status</Th>
              <Th align="right">Pages</Th>
              <Th align="right">Docs</Th>
              <Th>Last crawl</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.slice(0, 6).map((school) => (
              <TableRow
                key={school.id}
                className="group transition-colors hover:bg-[var(--surface-hover)]"
              >
                <TableCell className="px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Favicon domain={school.domain} />
                    <div className="min-w-0">
                      <Link
                        href={`/schools/${school.id}`}
                        className="block truncate font-medium text-foreground transition group-hover:text-primary"
                      >
                        {school.name || school.domain}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {school.domain}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <StatusBadge status={school.crawl_status} />
                </TableCell>
                <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {fmtNum(school.total_pages)}
                </TableCell>
                <TableCell className="px-5 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {fmtNum(school.total_docs)}
                </TableCell>
                <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                  {fmtRel(school.last_crawled)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function AiBriefingCard({
  stats,
  schools,
}: {
  stats: Stats | null;
  schools: School[];
}) {
  const corpusLabel = stats
    ? `${fmtNum(stats.total_pages)} pages / ${fmtNum(stats.total_docs)} docs`
    : "Corpus warming up";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Bot size={13} className="text-primary" />
            AI briefing
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            LLM chat preview
          </h2>
        </div>
        <Badge tone="live">Preview</Badge>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-[var(--card-2)] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SearchCheck size={15} className="text-primary" />
          Grounded by crawl data
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Ask about admissions gaps, differentiators, outdated content, and
          next-best actions across {schools[0]?.name || "the selected school"}.
        </p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <CheckCircle2 size={13} className="text-[var(--success)]" />
          {corpusLabel}
        </div>
      </div>

      <Link
        href="/chat"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:bg-[var(--foreground-soft)]"
      >
        Open AI workspace <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

function RecentJobsCard({
  jobs,
  schools,
}: {
  jobs: Job[];
  schools: School[];
}) {
  const recent = useMemo(() => jobs.slice(0, 4), [jobs]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Crawl runs
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Latest execution history.
          </div>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Jobs <ArrowRight size={12} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-[var(--card-2)] p-4 text-sm text-muted-foreground">
          Crawl runs will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((job) => {
            const school = schools.find((s) => s.id === job.school_id);
            return (
              <Link
                key={job.id}
                href={`/schools/${job.school_id}?job=${job.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[var(--card-2)] px-3 py-3 transition hover:bg-card"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {school?.name || school?.domain || `School ${job.school_id}`}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {fmtNum(job.pages_crawled)} pages · {fmtMs(job.duration_ms)}
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
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
      className={`px-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </TableHead>
  );
}

function placeholderSeries(current: number): number[] | undefined {
  if (!current || current < 2) return undefined;
  const n = 14;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = current * (0.45 + 0.55 * t);
    const wobble = current * 0.05 * Math.sin(i * 1.4);
    out.push(Math.max(0, base + wobble));
  }
  return out;
}
