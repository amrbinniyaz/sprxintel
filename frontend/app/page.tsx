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
} from "lucide-react";
import { api, Stats, School, Job } from "@/lib/api";
import {
  Card,
  StatCard,
  StatusBadge,
  Skeleton,
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
import { fmtMs, fmtNum, fmtRel } from "@/lib/utils";

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
    const t = window.setInterval(run, 1500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);

  const activeJobs = jobs.filter((j) => j.status === "running");

  return (
    <div className="space-y-7">
      <header>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Overview
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              School Intelligence Platform
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crawl, store, and explore school websites — pilot MVP.
            </p>
          </div>
          {stats && stats.active_jobs > 0 && (
            <Badge tone="live">
              {stats.active_jobs} crawl{stats.active_jobs > 1 ? "s" : ""} live
            </Badge>
          )}
        </div>
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
              hint="crawled or in progress"
              icon={<GraduationCap size={18} />}
              accent="violet"
            />
            <StatCard
              label="Pages"
              value={fmtNum(stats.total_pages)}
              hint={`avg ${stats.avg_pages_per_school} / school`}
              icon={<FileText size={18} />}
              accent="cyan"
            />
            <StatCard
              label="Documents"
              value={fmtNum(stats.total_docs)}
              hint="PDFs + linked docs"
              icon={<FileStack size={18} />}
              accent="green"
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
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px]" />
          ))
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
                  <TableRow key={s.id} className="hover:bg-[var(--surface-hover)]">
                    <TableCell className="px-4 py-3">
                      <Link
                        href={`/schools/${s.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {s.name || s.domain}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {s.domain}
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
                        className="text-xs font-medium text-primary transition-colors hover:underline"
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
          <EmptyState title="No jobs yet" />
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
                    <div className="flex items-center gap-3">
                      <Activity size={14} className="text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">
                          {sch?.name || sch?.domain || `school ${j.school_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
  return (
    <Card className="p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">
            {school?.name || school?.domain || `school ${job.school_id}`}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {job.current_url || "Discovering URLs…"}
          </div>
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
      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--card-2)] ring-1 ring-inset ring-border">
          <div
            className="shimmer h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
