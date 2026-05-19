Product Requirements Document
SprXintel — School Intelligence Platform
Author: Amr Niyaz
Reviewers: Simon Noakes
Status: Draft v1.0
Date: 16 May 2026

1. Executive Summary
SprXintel is an internal-first AI-powered data platform that crawls, stores, and enriches data from every school website starting with the 38,000 schools in Interactive Schools' HubSpot database. The platform combines this externally scraped data with first-party data from the 200+ schools using SprXcms to create a proprietary intelligence layer that competitors cannot legally replicate.
The platform powers four downstream products: EnrollIQ (lead scoring), SprXdata (CMS insights), HubSpot (CRM enrichment), and an LLM-powered chatbot that lets anyone ask natural-language questions across all school data.
Strategic vision: Position Interactive Schools as the data layer of global education, not just a web agency.

2. Problem Statement
Interactive Schools currently has fragmented intelligence about the school market:

HubSpot contains 38k schools but with minimal enrichment beyond contact data
SprXcms holds rich first-party behavioural data from 200 client schools, but it's siloed
Sales pitches rely on guesswork about each school's tech stack, content, and gaps
EnrollIQ lacks the data foundation to power accurate lead scoring
No proprietary dataset to underpin future AI/LLM products

Existing market tools (ZoomInfo, ScraperAPI, Crawl4AI) solve fragments of this — but none combine first-party CMS data + vertical-specific scraping + LLM access in one platform.

3. Strategic Opportunity
Interactive Schools is uniquely positioned because of three moats no competitor has:
MoatWhy It MattersVerticalOwning one industry beats serving many — see Veeva for pharma, Procore for constructionPermissionContractual access to 200 schools' first-party CMS data — legally unreplicableNetworkEvery new client = more data = smarter AI = more reason to be a client

4. Goals & Success Metrics
Primary Goals

Crawl, store, and enrich 100% of the 38k HubSpot school websites within 6 months
Deliver a working internal dashboard accessible to the Interactive Schools team
Power EnrollIQ, SprXdata, HubSpot enrichment, and an LLM chatbot from one data layer

Success Metrics
MetricTargetSchools fully crawled38,000 within 8 weeks of go-liveCrawl success rate≥ 92%Avg pages per school captured≥ 80AI enrichment coverage100% of crawled schoolsHubSpot fields enriched≥ 15 new fields per recordInternal dashboard adoption100% of sales + marketing team within 30 daysSales conversion uplift+15% within 6 monthsClient retention impactReduce churn by 25% in 12 months

5. Target Users
UserWhat They Do With ItSales teamPre-pitch research, lead enrichment, personalised outreachMarketing teamContent gap analysis, competitor monitoring, campaign targetingExisting clients (200)Competitive benchmarking dashboard, alerts, AI suggestionsProduct teamDecide CMS roadmap based on market signalsEnrollIQLead scoring signals, family-to-school match predictionInternal LLM ChatbotAnyone can ask natural language questions across all data

6. Scope
In Scope (Phase 1)

Crawl all 38k HubSpot school websites (full deep crawl)
Capture: text content, headings, metadata, internal links, downloadable documents (PDFs), full-page screenshots
AI enrichment via Claude (summary, tags, quality score, tech stack detection)
Storage in Postgres + Cloudflare R2
Vector embeddings via pgvector for LLM search
Internal dashboard (React + shadcn/ui)
HubSpot two-way sync
FastAPI access layer for EnrollIQ + SprXdata integration

Out of Scope (Phase 1)

Public-facing Schools Compass search engine (Phase 2)
Premium B2B SaaS marketplace (Phase 3)
Global schools beyond HubSpot 38k (Phase 4)
Personal data (staff names, emails, contact details) — explicitly excluded for GDPR compliance


7. Technical Architecture
HubSpot (38k URLs)
        ↓
   Crawler Engine        ← Crawl4AI + curl_cffi fallback
        ↓
   Job Queue              ← Celery + Redis (per-domain rate limit)
        ↓
   ┌─────────────────┐
   │  Postgres DB    │   ← structured data + pgvector embeddings
   │  Cloudflare R2  │   ← screenshots, PDFs, raw HTML
   └─────────────────┘
        ↓
   AI Enrichment          ← Claude Haiku (pages) + Sonnet (school profile)
        ↓
   FastAPI Layer          ← internal API
        ↓
   ┌────────────────────────────────────────┐
   │ Dashboard │ EnrollIQ │ SprXdata │ HubSpot │ Chatbot │
   └────────────────────────────────────────┘
Stack Decisions
LayerToolRationaleCrawlerCrawl4AILLM-ready markdown output, async, 58k GitHub stars, screenshot built-inAnti-bot fallbackcurl_cffi + residential proxiesBypasses Cloudflare TLS fingerprinting on protected school sitesQueueCelery + RedisProduction-grade retry logic, per-domain rate limiting via Redis token bucketStructured storagePostgresExisting stack, relational + vector in one DBVector searchpgvectorBelow 10M vectors, faster and cheaper than Pinecone/WeaviateFile storageCloudflare R2~28x cheaper than S3 at scale (zero egress fees)AI enrichmentClaude Haiku + SonnetAlready integrated via existing claude-api.amrniyaz.comAPIFastAPIExisting Dokploy deployment patternDashboardReact + shadcn/ui + TypeScriptMatches existing SprX design systemHostingHetzner VPS via DokployExisting infrastructure

8. Database Schema (Core Tables)
sqlschools (
  id, hubspot_id, domain, name, country, region,
  last_crawled, crawl_status, total_pages, total_docs
)

pages (
  id, school_id, url, title, meta_desc,
  headings (jsonb), body_text, body_markdown,
  status_code, screenshot_url, crawled_at,
  embedding vector(1536)
)

documents (
  id, school_id, url, file_type, file_size,
  storage_url, extracted_text, crawled_at
)

enrichment (
  id, school_id, ai_summary, content_tags (array),
  quality_score, cms_detected, tech_stack (jsonb),
  lead_score_signals (jsonb), last_enriched
)

crawl_jobs (
  id, school_id, status, started_at, completed_at,
  pages_crawled, errors (jsonb), retry_count
)

9. Crawler Specification
Per-School Process

Read root URL from HubSpot
Discover sitemap.xml or crawl from homepage
Build internal URL graph (max 500 pages per school)
Respect robots.txt
Apply per-domain rate limit (1–2 req/sec)
For each page:

Try lightweight HTTP fetch first (Crawl4AI)
Fall back to full browser render if needed
Extract: title, headings, body, meta, links
Convert to markdown
Capture full-page screenshot
Download linked PDFs/docs


Write to Postgres + R2
Mark school complete

Concurrency

50 concurrent workers (tunable)
2 req/sec max per domain (politeness)
Retry logic: exponential backoff, max 3 retries

Expected Performance

38k sites × ~100 pages = ~3.8M pages
~24–48 hours for full first crawl
~5–10 days realistic with retries and blocked sites


10. AI Enrichment Specification
Per-Page (Claude Haiku)

One-sentence summary
Content tags (boarding, faith, SEND, sixth form, IB, A-Level, etc.)
Quality score (1–10)
Reading level

Per-School (Claude Sonnet)

Full school profile (200 words)
CMS detected (WordPress, Drupal, Blackbaud, Finalsite, SprXcms, etc.)
Tech stack (analytics, chat tool, CRM, payment, cookie tool)
Lead score signals (last website refresh date, content depth, design quality)
Competitive tier (premium / mid / budget)

Vector Embeddings

All page markdown embedded via text-embedding-3-small
Stored in pgvector with HNSW index
Powers LLM chatbot retrieval


11. Dashboard Features
Top-Level Stats

Total schools crawled / total pages / total screenshots / AI enrichment %

School List (Searchable Table)

Filter by: Country, CMS, Status, Tags, Quality Score
Sort by: Score, Pages, Last Crawled
Bulk actions: re-crawl, export CSV, push to HubSpot

School Detail Panel

Screenshot preview
AI summary
Pages list with markdown preview
Downloaded documents
Tech stack detected
Lead score signals
Compare to peer schools button
"Push to HubSpot" button

Crawl Jobs Page

Live progress bar for active crawls
Failure log with retry buttons
Cost tracking (compute + API spend)

LLM Chat Interface

Natural language queries across all schools
Example: "Which UK girls' boarding schools added a Sixth Form Centre in the last 12 months?"
Returns structured answers with school references
Citations to source pages


12. Integrations
IntegrationDirectionPurposeHubSpotTwo-wayPull URL list, push enrichment fieldsEnrollIQOutbound APILead score signals, family-school matchingSprXdataOutbound APICMS insights, content quality metricsClaude APIOutboundEnrichment + chatbotSprXcmsFuture Phase 2First-party behavioural data join

13. Legal & Compliance
Approach

Respect robots.txt — non-negotiable per CNIL/UK ICO guidance
No personal data — scraper explicitly skips staff names, emails, phone numbers, photos
Rate limiting — 2 req/sec max per domain
Legitimate Interest Assessment documented per GDPR Article 6(1)(f)
Audit logs — all crawls timestamped and stored 12 months
Right to erasure — schools can request removal via standard process

Risk Mitigation

Only crawl public institutional content (programmes, fees, news, policies)
Skip pages behind logins or paywalls
No bypassing of access controls
UK GDPR + EU GDPR + CCPA aligned


14. Cost Breakdown
One-off Setup

Initial development (8 weeks): in-house
Initial AI enrichment (full 38k): ~£200–400 one-off

Ongoing Monthly
ItemCostHetzner VPS (crawler + queue)£40–80Cloudflare R2 (~30GB screenshots + docs)£15–30Postgres (managed or self-hosted)£0–20Residential proxies (for blocked sites)£50–100Claude API (ongoing re-enrichment)£30–80Total monthly£135–310
Compared To Buying Equivalent

ZoomInfo: £15k–30k/year, generic, no schools focus
Apify hosted: £5k+/month at this scale
Building this internally: payback in under 3 months


15. Phased Roadmap
Phase 1 — Foundation (Weeks 1–8)

Crawl pipeline live for all 38k schools
AI enrichment complete
Internal dashboard MVP
HubSpot enrichment two-way sync
FastAPI access layer

Phase 2 — Intelligence (Weeks 9–16)

LLM chatbot for internal team
Competitive benchmarking views
Client-facing dashboards for 200 SprXcms clients
Auto-generated quarterly "state of your market" reports

Phase 3 — Public Layer (Weeks 17–28)

Schools Compass — free public search engine for parents
SEO-optimised, lead-gen for Interactive Schools
Every result links to the school + "Built by Interactive Schools" attribution

Phase 4 — Commercial (Months 7–12)

SprXintel Pro — premium B2B SaaS
Target: Edtech vendors, publishers, recruiters, investors
API-based access with tiered pricing
Net new revenue stream


16. Risks & Mitigations
RiskLikelihoodMitigationSites blocking the crawler (Cloudflare)HighCrawl4AI v0.8.5 anti-bot + residential proxy fallbackGDPR breach via accidental PII captureMediumSkip-list at extraction layer + audit logsStorage costs exceeding estimatesLowR2 zero egress + tier-based retention policyAI enrichment cost spikeLowHaiku used for bulk, Sonnet only per-schoolSolo-developer dependency on Crawl4AIMediumStack designed so Crawl4AI is swappableCrawl freshness stalenessMediumMonthly re-crawl cycle, change detection only

17. Open Questions for Simon

Should client-facing dashboards be free (retention play) or paid (revenue play)?
Do we want public Schools Compass launched within 12 months, or focus internal first?
How much budget is available for residential proxy infrastructure?
Do we have legal sign-off on the LIA for scraping at this scale?
Who owns the data — Interactive Schools as a company, or split with clients via SprXcms data?


18. Next Steps

✅ Research complete
⏭️ PRD review with Simon
⏭️ Pilot crawl on 500 URLs (1 week)
⏭️ Demo pilot results to leadership
⏭️ Greenlight full build
⏭️ Phase 1 kickoff


End of PRD