export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8765";

export interface Stats {
  total_schools: number;
  total_pages: number;
  total_docs: number;
  avg_pages_per_school: number;
  active_jobs: number;
  last_crawl_ms: number | null;
}

export interface School {
  id: number;
  domain: string;
  name: string | null;
  seed_url: string;
  crawl_status: "pending" | "running" | "done" | "failed";
  total_pages: number;
  total_docs: number;
  total_failures: number;
  last_crawled: string | null;
  last_crawl_ms: number | null;
  pages_per_sec: number | null;
  created_at: string;

  ai_summary: string | null;
  ai_score: number | null;
  content_score: number | null;
  marketing_score: number | null;
  category_tag: string | null;
  health_tag: string | null;
  ai_analyzed_at: string | null;
}

export interface Page {
  id: number;
  school_id: number;
  url: string;
  title: string | null;
  meta_desc: string | null;
  word_count: number;
  status_code: number;
  fetch_ms: number;
  depth: number;
  crawled_at: string;
}

export interface PageDetail extends Page {
  headings: Record<string, string[]> | null;
  body_markdown: string | null;
}

export interface Document {
  id: number;
  url: string;
  file_type: string | null;
  discovered_at: string;
}

export interface Job {
  id: number;
  school_id: number;
  status: "pending" | "running" | "done" | "failed";
  max_pages: number;
  concurrency: number;
  rate_per_sec: number;
  pages_crawled: number;
  pages_failed: number;
  docs_found: number;
  queue_size: number;
  current_url: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number;
  created_at: string;
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`API ${r.status}: ${text || r.statusText}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  health: () => fetchJSON<{ ok: boolean }>("/api/health"),
  stats: () => fetchJSON<Stats>("/api/stats"),
  schools: () => fetchJSON<School[]>("/api/schools"),
  school: (id: number) => fetchJSON<School>(`/api/schools/${id}`),
  pages: (id: number, q?: string) =>
    fetchJSON<Page[]>(
      `/api/schools/${id}/pages?limit=2000${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  failures: (id: number) =>
    fetchJSON<Page[]>(`/api/schools/${id}/failures?limit=2000`),
  documents: (id: number) =>
    fetchJSON<Document[]>(`/api/schools/${id}/documents?limit=500`),
  page: (id: number) => fetchJSON<PageDetail>(`/api/pages/${id}`),
  jobs: () => fetchJSON<Job[]>("/api/jobs?limit=50"),
  job: (id: number) => fetchJSON<Job>(`/api/jobs/${id}`),
  startCrawl: (body: {
    url: string;
    name?: string;
    max_pages?: number;
    concurrency?: number;
    rate_per_sec?: number;
  }) =>
    fetchJSON<Job>("/api/crawl", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  cancelJob: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/jobs/${id}/cancel`, { method: "POST" }),
  analyzeSchool: (id: number) =>
    fetchJSON<School>(`/api/schools/${id}/analyze`, { method: "POST" }),
};
