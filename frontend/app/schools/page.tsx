"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Download, Sparkles } from "lucide-react";
import { api, API_BASE, School } from "@/lib/api";
import {
  Card,
  Input,
  StatusBadge,
  EmptyState,
  Skeleton,
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

  const filtered = schools.filter(
    (s) =>
      !q ||
      s.name?.toLowerCase().includes(q.toLowerCase()) ||
      s.domain.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Directory
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Schools
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All crawled schools and their freshness.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={setQ}
            placeholder="Search schools…"
            className="pl-9"
          />
        </div>
        <a href={`${API_BASE}/api/schools.csv`}>
          <Button variant="secondary">
            <Download size={14} /> Export CSV
          </Button>
        </a>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 ? (
        <EmptyState title={q ? "No matches" : "No schools yet"} />
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
                <TableRow key={s.id} className="hover:bg-[var(--surface-hover)]">
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/schools/${s.id}`}
                      className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {s.name || s.domain}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      <a
                        href={s.seed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-foreground hover:underline"
                      >
                        {s.domain}
                      </a>
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
