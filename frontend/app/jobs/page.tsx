"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Job, School } from "@/lib/api";
import { Card, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMs, fmtNum, fmtRel } from "@/lib/utils";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Crawl Jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every crawl run, live progress, retry status.
        </p>
      </header>

      {loading ? (
        <Skeleton className="h-64" />
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs yet" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <Th>#</Th>
                <Th>School</Th>
                <Th>Status</Th>
                <Th align="right">Pages</Th>
                <Th align="right">Failed</Th>
                <Th align="right">Docs</Th>
                <Th align="right">Duration</Th>
                <Th>Created</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => {
                const sch = schools.find((s) => s.id === j.school_id);
                return (
                  <TableRow key={j.id} className="hover:bg-[var(--surface-hover)]">
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{j.id}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Link
                        href={`/schools/${j.school_id}?job=${j.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {sch?.name || sch?.domain || `school ${j.school_id}`}
                      </Link>
                      {j.current_url && j.status === "running" && (
                        <div className="truncate text-xs text-muted-foreground">
                          {j.current_url}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={j.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground">
                      {fmtNum(j.pages_crawled)} / {fmtNum(j.max_pages)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {j.pages_failed}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {j.docs_found}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground">
                      {j.status === "running" ? "—" : fmtMs(j.duration_ms)}
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
