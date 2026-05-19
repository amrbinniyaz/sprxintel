"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, Sparkles, X } from "lucide-react";
import { api, API_BASE, School } from "@/lib/api";
import {
  Card,
  Input,
  StatusBadge,
  EmptyState,
  Button,
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
import { Favicon } from "@/components/favicon";
import { NoSchools } from "@/components/illustrations";
import { fmtMs, fmtNum, fmtRel } from "@/lib/utils";

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api.schools();
        setSchools(s);
      } catch {
        // transient — keep last known state, retry on next tick
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () =>
      schools.filter(
        (s) =>
          !q ||
          s.name?.toLowerCase().includes(q.toLowerCase()) ||
          s.domain.toLowerCase().includes(q.toLowerCase()),
      ),
    [schools, q],
  );

  const counts = useMemo(() => {
    const out = { total: schools.length, done: 0, running: 0, failed: 0 };
    for (const s of schools) {
      if (s.crawl_status === "done") out.done++;
      else if (s.crawl_status === "running") out.running++;
      else if (s.crawl_status === "failed") out.failed++;
    }
    return out;
  }, [schools]);

  return (
    <div className="stagger space-y-7">
      <header>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Directory
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              <span className="text-foreground">All </span>
              <span className="text-gradient-primary">Schools</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every school we&apos;ve crawled, with freshness signals and AI enrichment.
            </p>
          </div>
          {counts.total > 0 && (
            <div className="flex items-center gap-2">
              <Badge>{fmtNum(counts.total)} total</Badge>
              {counts.running > 0 && <Badge tone="live">{counts.running} running</Badge>}
              {counts.failed > 0 && <Badge tone="danger">{counts.failed} failed</Badge>}
            </div>
          )}
        </div>
        <div className="divider-fade mt-6" />
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="group relative max-w-sm flex-1">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-md opacity-0 ring-2 ring-[color-mix(in_oklab,var(--primary)_30%,transparent)] transition-opacity duration-200 group-focus-within:opacity-100"
          />
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
          />
          <Input
            value={q}
            onChange={setQ}
            placeholder="Search by name or domain…"
            className="pl-9 pr-8"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:bg-[var(--surface-hover)] hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {q && (
          <span className="text-xs text-muted-foreground">
            {fmtNum(filtered.length)} of {fmtNum(schools.length)}
          </span>
        )}
        <div className="ml-auto">
          <a href={`${API_BASE}/api/schools.csv`}>
            <Button variant="secondary">
              <Download size={14} /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      {loading ? (
        <SchoolsTableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : "No schools yet"}
          hint={
            q
              ? "Try a different name or domain — partial matches work."
              : "Kick off your first crawl from the overview page."
          }
          illustration={<NoSchools className="h-full w-full" />}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <Th>School</Th>
                <Th>Status</Th>
                <Th>AI insight</Th>
                <Th align="right">Pages</Th>
                <Th align="right">Docs</Th>
                <Th align="right">Duration</Th>
                <Th align="right">Pages/sec</Th>
                <Th>Last crawl</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
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
                        <a
                          href={s.seed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                        >
                          {s.domain}
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={s.crawl_status} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <AiCell school={s} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                    {fmtNum(s.total_pages)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                    {fmtNum(s.total_docs)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                    {fmtMs(s.last_crawl_ms)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {s.pages_per_sec != null ? s.pages_per_sec.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {fmtRel(s.last_crawled)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
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

function AiCell({ school }: { school: School }) {
  if (school.ai_score == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles size={11} /> —
      </span>
    );
  }
  const score = school.ai_score;
  const color =
    score >= 70
      ? "var(--success)"
      : score >= 40
        ? "var(--cyan)"
        : "var(--warning)";
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md px-1.5 font-mono text-xs font-semibold tabular-nums ring-1 ring-inset"
        style={{
          color,
          backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
          borderColor: `color-mix(in oklab, ${color} 28%, transparent)`,
        }}
        title={`Content ${school.content_score ?? "—"} · Marketing ${school.marketing_score ?? "—"}`}
      >
        {score}
      </span>
      {school.category_tag && <Badge tone="info">{school.category_tag}</Badge>}
    </div>
  );
}

function SchoolsTableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border">
        <div className="grid grid-cols-[1fr_100px_140px_80px_80px_80px_80px_100px] gap-4 px-4 py-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-full max-w-[80%] animate-pulse rounded bg-[var(--card-2)] ring-1 ring-inset ring-border"
            />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[1fr_100px_140px_80px_80px_80px_80px_100px] items-center gap-4 px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 shrink-0 animate-pulse rounded-sm bg-[var(--card-2)] ring-1 ring-inset ring-border" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--card-2)]" />
                <div className="h-2.5 w-2/5 animate-pulse rounded bg-[var(--card-2)]" />
              </div>
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-3 w-full max-w-[70%] animate-pulse rounded bg-[var(--card-2)]"
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
