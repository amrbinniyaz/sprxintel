"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Globe, Loader2, Play, Plus, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { api } from "@/lib/api";

export function StartCrawlCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-9 shrink-0">
        <Plus size={14} />
        New crawl
      </Button>

      {open && <StartCrawlModal onClose={() => setOpen(false)} />}
    </>
  );
}

function StartCrawlModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("https://www.ursulinedallas.org");
  const [maxPages, setMaxPages] = useState("500");
  const [concurrency, setConcurrency] = useState("10");
  const [rate, setRate] = useState("3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const job = await api.startCrawl({
        url: url.trim(),
        max_pages: parseInt(maxPages) || 500,
        concurrency: parseInt(concurrency) || 10,
        rate_per_sec: parseFloat(rate) || 2,
      });
      onClose();
      router.push(`/schools/${job.school_id}?job=${job.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,23,42,0.28)] px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-crawl-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-[560px] p-5 shadow-[var(--shadow-lg)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Crawl setup
            </div>
            <h3
              id="start-crawl-title"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground"
            >
              Start crawl
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Seed a site, respect robots, and persist pages as the crawler runs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-[var(--surface-hover)] hover:text-foreground"
            aria-label="Close crawl modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Seed URL">
            <div className="group relative">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-md opacity-0 ring-2 ring-[color-mix(in_oklab,var(--primary)_30%,transparent)] transition-opacity duration-200 group-focus-within:opacity-100"
              />
              <Globe
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
              />
              <Input
                value={url}
                onChange={setUrl}
                placeholder="https://example.org"
                className="pl-9"
              />
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Pages">
              <Input
                value={maxPages}
                onChange={setMaxPages}
                placeholder="500"
                type="number"
              />
            </Field>
            <Field label="Workers">
              <Input
                value={concurrency}
                onChange={setConcurrency}
                placeholder="10"
                type="number"
              />
            </Field>
            <Field label="Req/sec">
              <Input
                value={rate}
                onChange={setRate}
                placeholder="3"
                type="number"
              />
            </Field>
          </div>

          <Button onClick={submit} disabled={busy} className="h-10 w-full">
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play size={14} />
                Start crawl
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-[var(--card-2)] px-3 py-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--success)]" />
            The crawler stays same-domain, rate limited, and robots-aware.
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
