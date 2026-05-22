"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FileStack,
  Clock,
  Globe,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  api,
  Job,
  Page,
  PageDetail,
  School,
  Document,
} from "@/lib/api";
import {
  Card,
  StatCard,
  StatusBadge,
  Skeleton,
  Input,
  Badge,
  Button,
} from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fmtMs, fmtNum, fmtRel } from "@/lib/utils";

type TabId = "pages" | "documents" | "failures";

export default function SchoolDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const schoolId = parseInt(id);

  const [school, setSchool] = useState<School | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [failures, setFailures] = useState<Page[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PageDetail | null>(null);
  const [tab, setTab] = useState<TabId>("pages");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const [s, p, d, f, jobs] = await Promise.all([
          api.school(schoolId),
          api.pages(schoolId),
          api.documents(schoolId),
          api.failures(schoolId),
          api.jobs(),
        ]);
        if (stop) return;
        setSchool(s);
        setPages(p);
        setDocs(d);
        setFailures(f);
        const latest = jobs.find((j) => j.school_id === schoolId) || null;
        setJob(latest);
      } catch {
        // swallow
      }
    };
    load();
    const t = setInterval(load, 1500);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [schoolId]);

  const filtered = useMemo(
    () =>
      pages.filter(
        (p) =>
          !q ||
          (p.title || "").toLowerCase().includes(q.toLowerCase()) ||
          p.url.toLowerCase().includes(q.toLowerCase()),
      ),
    [pages, q],
  );

  async function openPage(id: number) {
    try {
      const detail = await api.page(id);
      setSelected(detail);
    } catch {
      // page fetch failed — drawer stays closed
    }
  }

  async function reanalyze() {
    setAnalyzing(true);
    try {
      const fresh = await api.analyzeSchool(schoolId);
      setSchool(fresh);
    } catch {
      // surface failures silently; the polling loop will reconcile
    } finally {
      setAnalyzing(false);
    }
  }

  if (!school) {
    return <Skeleton className="h-64" />;
  }

  const pct = job ? (job.pages_crawled / Math.max(job.max_pages, 1)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/schools"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} /> Schools
        </Link>
        <a
          href={school.seed_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Open site <ExternalLink size={12} />
        </a>
      </div>

      <header className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {school.name || school.domain}
            </h1>
            <StatusBadge status={school.crawl_status} />
          </div>
          <div className="mt-1.5 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Globe size={14} />
            <a
              href={school.seed_url}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {school.domain}
            </a>
          </div>
        </div>
      </header>

      {job && job.status === "running" && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <span className="pulse-dot inline-block size-1.5 rounded-full bg-primary" />
                Crawling…
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {job.current_url || "Resolving URLs…"}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {fmtNum(job.pages_crawled)}
              </span>{" "}
              / {fmtNum(job.max_pages)} · queue {fmtNum(job.queue_size)}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--card-2)] ring-1 ring-inset ring-border">
            <div
              className="shimmer h-full rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </Card>
      )}

      {school.ai_summary && (
        <AiSummaryCard
          school={school}
          analyzing={analyzing}
          onReanalyze={reanalyze}
        />
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Pages"
          value={fmtNum(school.total_pages)}
          icon={<FileText size={18} />}
          accent="cyan"
        />
        <StatCard
          label="Documents"
          value={fmtNum(school.total_docs)}
          icon={<FileStack size={18} />}
          accent="green"
        />
        <StatCard
          label="Crawl duration"
          value={job ? fmtMs(job.duration_ms) : "—"}
          hint={job ? `${job.pages_failed} failed` : ""}
          icon={<Clock size={18} />}
          accent="amber"
        />
        <StatCard
          label="Last crawl"
          value={fmtRel(school.last_crawled)}
          hint={job ? `job #${job.id}` : ""}
          icon={<Clock size={18} />}
          accent="violet"
        />
      </section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList variant="line" className="border-b border-border">
          <TabsTrigger value="pages">
            Pages
            <span className="ml-1 text-muted-foreground">
              {fmtNum(pages.length)}
            </span>
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            <span className="ml-1 text-muted-foreground">
              {fmtNum(docs.length)}
            </span>
          </TabsTrigger>
          <TabsTrigger value="failures">
            <AlertTriangle
              size={12}
              className={failures.length > 0 ? "text-[var(--warning)]" : ""}
            />
            Failures
            <span className="ml-1 text-muted-foreground">
              {fmtNum(failures.length)}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4 space-y-4">
          <div className="max-w-sm">
            <Input value={q} onChange={setQ} placeholder="Search pages…" />
          </div>
          <Card className="overflow-hidden">
            <div className="max-h-[640px] overflow-y-auto scrollbar-thin">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                  <TableRow>
                    <ThCol className="w-[45%]">Title</ThCol>
                    <ThCol className="w-[35%]">URL</ThCol>
                    <ThCol align="right" className="w-[80px]">Words</ThCol>
                    <ThCol align="right" className="w-[70px]">Depth</ThCol>
                    <ThCol align="right" className="w-[90px]">Fetch</ThCol>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => openPage(p.id)}
                      className="cursor-pointer hover:bg-[var(--surface-hover)]"
                    >
                      <TableCell className="py-2.5">
                        <div className="truncate font-medium text-foreground">
                          {p.title || "—"}
                        </div>
                        {p.meta_desc && (
                          <div className="truncate text-xs text-muted-foreground">
                            {p.meta_desc}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {p.url.replace(school.seed_url, "")}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {fmtNum(p.word_count)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Badge>{p.depth}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {p.fetch_ms}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            {docs.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No documents linked from this site yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {docs.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge tone="info">{d.file_type?.toUpperCase()}</Badge>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {d.url}
                      </div>
                    </div>
                    <ExternalLink size={12} className="text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="failures" className="mt-4 space-y-3">
          <div className="text-xs text-muted-foreground">
            URLs the crawler tried but got a non-200 response from. Mostly broken
            internal links on the site itself — useful as a content-audit
            signal.
          </div>
          <Card className="overflow-hidden">
            {failures.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No failures recorded for this site.
              </div>
            ) : (
              <div className="max-h-[640px] overflow-y-auto scrollbar-thin">
                <Table className="table-fixed">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                    <TableRow>
                      <ThCol className="w-[110px]">Status</ThCol>
                      <ThCol>URL</ThCol>
                      <ThCol align="right" className="w-[70px]">Depth</ThCol>
                      <ThCol align="right" className="w-[90px]">Fetch</ThCol>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failures.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="py-2.5">
                          <Badge
                            tone={
                              p.status_code === 0
                                ? "danger"
                                : p.status_code >= 500
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {p.status_code === 0 ? "TIMEOUT" : p.status_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                          >
                            {p.url.replace(school.seed_url, "")}
                          </a>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <Badge>{p.depth}</Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono text-xs text-muted-foreground">
                          {p.fetch_ms}ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-[640px] scrollbar-thin"
        >
          {selected && <PageDrawerContents page={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function healthTone(tag: string | null | undefined) {
  if (tag === "Strong content") return "success" as const;
  if (tag === "Average content") return "info" as const;
  if (tag === "Many broken links") return "danger" as const;
  return "warning" as const;
}

function AiSummaryCard({
  school,
  analyzing,
  onReanalyze,
}: {
  school: School;
  analyzing: boolean;
  onReanalyze: () => void;
}) {
  const score = school.ai_score;
  const ringColor =
    score == null
      ? "var(--border)"
      : score >= 70
        ? "var(--success)"
        : score >= 40
          ? "var(--cyan)"
          : "var(--warning)";

  return (
    <Card className="p-5">
      <div className="flex items-start gap-5">
        <div
          className="grid size-20 shrink-0 place-items-center rounded-full ring-2 ring-inset"
          style={{ borderColor: ringColor, color: ringColor, boxShadow: `inset 0 0 0 2px ${ringColor}` }}
        >
          <div className="text-center">
            <div className="text-2xl font-semibold leading-none" style={{ color: ringColor }}>
              {score ?? "—"}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              / 100
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles size={11} /> AI summary
              <Badge className="ml-1">Preview</Badge>
            </div>
            {school.category_tag && (
              <Badge tone="info">{school.category_tag}</Badge>
            )}
            {school.health_tag && (
              <Badge tone={healthTone(school.health_tag)}>
                {school.health_tag}
              </Badge>
            )}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {school.ai_summary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>
              Content{" "}
              <span className="font-mono tabular-nums text-foreground">
                {school.content_score ?? "—"}
              </span>
            </span>
            <span>
              Marketing{" "}
              <span className="font-mono tabular-nums text-foreground">
                {school.marketing_score ?? "—"}
              </span>
            </span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={onReanalyze}
          disabled={analyzing}
          className="shrink-0"
        >
          <RefreshCw
            size={12}
            className={analyzing ? "animate-spin" : ""}
          />
          Re-analyze
        </Button>
      </div>
    </Card>
  );
}

function ThCol({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <TableHead
      className={`px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${
        align === "right" ? "text-right" : ""
      } ${className}`}
    >
      {children}
    </TableHead>
  );
}

function PageDrawerContents({ page }: { page: PageDetail }) {
  return (
    <div className="flex flex-col">
      <SheetHeader className="border-b border-border px-6 py-5">
        <SheetTitle className="text-lg font-semibold leading-tight tracking-tight">
          {page.title || "—"}
        </SheetTitle>
        <SheetDescription className="mt-1">
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {page.url}
            <ExternalLink size={11} />
          </a>
        </SheetDescription>
      </SheetHeader>

      <div className="px-6 py-5">
        {page.meta_desc && (
          <p className="text-sm text-muted-foreground">{page.meta_desc}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>Depth {page.depth}</Badge>
          <Badge tone="info">{fmtNum(page.word_count)} words</Badge>
          <Badge tone="success">HTTP {page.status_code}</Badge>
          <Badge>{page.fetch_ms}ms</Badge>
        </div>

        {page.headings && Object.keys(page.headings).length > 0 && (
          <div className="mt-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Headings
            </div>
            <div className="mt-2 space-y-3">
              {Object.entries(page.headings).map(([lvl, vals]) => (
                <div key={lvl}>
                  <div className="text-xs font-medium text-muted-foreground">
                    {lvl.toUpperCase()}
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-foreground">
                    {vals.slice(0, 8).map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {page.body_markdown && (
          <div className="mt-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Markdown
            </div>
            <pre className="mt-2 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-[var(--card-2)] p-4 font-mono text-[11px] leading-relaxed text-[var(--foreground-soft)] scrollbar-thin">
              {page.body_markdown.slice(0, 8000)}
              {page.body_markdown.length > 8000 && "\n\n…"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
