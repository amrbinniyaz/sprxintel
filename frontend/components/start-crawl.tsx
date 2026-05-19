"use client";

import { useState } from "react";
import { Play, Loader2, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { api } from "@/lib/api";

export function StartCrawlCard() {
  const router = useRouter();
  const [url, setUrl] = useState("https://www.ursulinedallas.org");
  const [maxPages, setMaxPages] = useState("500");
  const [concurrency, setConcurrency] = useState("10");
  const [rate, setRate] = useState("3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push(`/schools/${job.school_id}?job=${job.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="relative overflow-hidden p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--primary-soft)] to-transparent"
      />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Start a pilot crawl
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              BFS from the seed URL · sitemap- and robots-aware · 500-page cap by default.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_120px_120px_auto]">
          <Field label="Seed URL">
            <div className="relative">
              <Globe
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={url}
                onChange={setUrl}
                placeholder="https://example.org"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Max pages">
            <Input
              value={maxPages}
              onChange={setMaxPages}
              placeholder="500"
              type="number"
            />
          </Field>
          <Field label="Concurrency">
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
          <Field label="" hideLabel>
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play size={14} />
                  Start crawl
                </>
              )}
            </Button>
          </Field>
        </div>
        {error && (
          <div className="mt-3 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
  hideLabel,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground ${hideLabel ? "invisible" : ""}`}
      >
        {hideLabel ? "_" : label}
      </span>
      {children}
    </label>
  );
}
