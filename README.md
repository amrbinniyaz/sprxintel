# SprXintel — MVP

Pilot crawler + dashboard for the SprXintel platform (per `prd.md`).
MVP scope: crawl one school site, store locally, browse in a dashboard.
No HubSpot / EnrollIQ / SprXdata / AI enrichment yet — see PRD §6 for full scope.

## What's here

```
backend/        FastAPI + async crawler (httpx + BeautifulSoup) + SQLite
frontend/       Next.js 16 + Tailwind 4 dashboard
```

Storage is a single local file: `backend/data/sprxintel.db`. Postgres + pgvector
swap-in is straightforward (the SQLAlchemy models are portable).

## Run it

```bash
# terminal 1 — backend on :8765
cd backend
./run.sh

# terminal 2 — dashboard on :3030
cd frontend
npm run dev -- --port 3030
```

Open <http://localhost:3030>.

## Pilot run (Ursuline Academy of Dallas)

| Metric              | Value                       |
| ------------------- | --------------------------- |
| Seed URL            | https://www.ursulinedallas.org |
| Page cap            | 500                         |
| Concurrency         | 10                          |
| Rate limit          | 3 req/sec / domain          |
| **Pages crawled**   | **218**                     |
| **Documents found** | **18**                      |
| Pages failed (4xx)  | 114 (broken internal links) |
| **Duration**        | **~2 min (122s)**           |
| Effective throughput| ~2.7 req/sec                |

The site has no `sitemap.xml`; crawler fell back to homepage BFS and naturally
exhausted the same-domain URL graph before the 500-page cap. 114 failures are
real 4xx responses from broken internal links on the site itself — useful
content-debt signal we can surface later.

## Projection to 38k schools

Linear back-of-envelope, assuming similar mix of small/medium sites:
- ~100 pages/school avg → 3.8M pages
- 50 concurrent workers (PRD spec), 2 req/sec/domain
- ~24–48h first pass; 5–10 days with retries

## Architecture (MVP)

```
Browser (Next.js dashboard) ──HTTP──> FastAPI (port 8765)
                                         │
                                         ├── async crawler (httpx + BeautifulSoup)
                                         │     ├── robots.txt aware
                                         │     ├── sitemap-seeded, BFS fallback
                                         │     ├── same-domain only
                                         │     └── per-domain token bucket
                                         │
                                         └── SQLAlchemy ──> SQLite (data/sprxintel.db)
```

Tables: `schools`, `pages`, `documents`, `crawl_jobs`. Background asyncio task
per crawl, persists pages incrementally so the dashboard can poll live progress.

## API

| Method | Path                          | Notes                          |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/api/health`                 |                                |
| GET    | `/api/stats`                  | dashboard summary              |
| POST   | `/api/crawl`                  | `{url, max_pages, concurrency, rate_per_sec}` |
| GET    | `/api/schools`                |                                |
| GET    | `/api/schools/{id}`           |                                |
| GET    | `/api/schools/{id}/pages`     | `?q=...`                       |
| GET    | `/api/schools/{id}/documents` |                                |
| GET    | `/api/pages/{id}`             | full markdown + headings       |
| GET    | `/api/jobs`                   |                                |
| GET    | `/api/jobs/{id}`              |                                |
| POST   | `/api/jobs/{id}/cancel`       |                                |

## Next steps (not in MVP)

- [ ] Playwright fallback for JS-heavy sites + screenshot capture
- [ ] AI enrichment via Claude (per-page Haiku, per-school Sonnet)
- [ ] pgvector embeddings (text-embedding-3-small)
- [ ] Postgres swap (engine URL is the only change needed)
- [ ] Celery + Redis fanout for the 38k-school batch
- [ ] HubSpot bidirectional sync
- [ ] LLM chat across crawled corpus
