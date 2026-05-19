from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import timezone
from typing import Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from .crawler import Crawler, CrawlProgress, PageResult
from .db import CrawlJob, Document, Page, School, SessionLocal, init_db, utcnow
from .scoring import analyze_school
from .schemas import (
    CrawlRequest,
    DocumentOut,
    JobOut,
    PageDetail,
    PageOut,
    SchoolOut,
    Stats,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
log = logging.getLogger("api")

# Track currently running crawl tasks: job_id -> Task
_running: dict[int, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    # cancel any in-flight jobs
    for t in _running.values():
        t.cancel()


app = FastAPI(title="SprXintel MVP", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------- helpers ----------------------------- #
def _domain_of(url: str) -> str:
    host = urlparse(str(url)).netloc.lower()
    return host.removeprefix("www.")


async def _upsert_school(seed_url: str, name: Optional[str]) -> School:
    domain = _domain_of(seed_url)
    async with SessionLocal() as s:
        existing = (await s.execute(select(School).where(School.domain == domain))).scalar_one_or_none()
        if existing:
            existing.seed_url = seed_url
            if name:
                existing.name = name
            await s.commit()
            await s.refresh(existing)
            return existing
        sch = School(domain=domain, seed_url=seed_url, name=name or domain)
        s.add(sch)
        await s.commit()
        await s.refresh(sch)
        return sch


async def _run_crawl(job_id: int, school_id: int, req: CrawlRequest) -> None:
    """Background crawl coroutine. Persists pages/docs as it goes."""
    started = time.monotonic()
    log.info("job %s starting crawl of %s", job_id, req.url)

    async def on_page(p: PageResult) -> None:
        # Always store something — successful pages get full content,
        # failures get a row with just url + status_code (visible as link-rot signal).
        async with SessionLocal() as s:
            stmt = sqlite_insert(Page).values(
                school_id=school_id,
                url=p.url,
                title=p.title,
                meta_desc=p.meta_desc,
                headings=p.headings or None,
                body_text=p.body_text or None,
                body_markdown=p.body_markdown or None,
                word_count=p.word_count,
                status_code=p.status_code,
                content_type=p.content_type,
                fetch_ms=p.fetch_ms,
                depth=p.depth,
            )
            stmt = stmt.on_conflict_do_nothing(index_elements=["school_id", "url"])
            await s.execute(stmt)
            for doc_url, ftype in p.docs:
                d_stmt = sqlite_insert(Document).values(
                    school_id=school_id, url=doc_url, file_type=ftype
                ).on_conflict_do_nothing(index_elements=["school_id", "url"])
                await s.execute(d_stmt)
            await s.commit()

    async def on_progress(prog: CrawlProgress) -> None:
        async with SessionLocal() as s:
            job = await s.get(CrawlJob, job_id)
            if not job:
                return
            job.pages_crawled = prog.pages_crawled
            job.pages_failed = prog.pages_failed
            job.docs_found = prog.docs_found
            job.queue_size = prog.queue_size
            job.current_url = prog.current_url
            await s.commit()

    crawler = Crawler(
        seed_url=str(req.url),
        max_pages=req.max_pages,
        concurrency=req.concurrency,
        rate_per_sec=req.rate_per_sec,
        on_page=on_page,
        on_progress=on_progress,
    )

    try:
        async with SessionLocal() as s:
            job = await s.get(CrawlJob, job_id)
            job.status = "running"
            job.started_at = utcnow()
            await s.commit()
            sch = await s.get(School, school_id)
            sch.crawl_status = "running"
            await s.commit()

        prog = await crawler.run()

        async with SessionLocal() as s:
            job = await s.get(CrawlJob, job_id)
            job.status = "done"
            job.pages_crawled = prog.pages_crawled
            job.pages_failed = prog.pages_failed
            job.docs_found = prog.docs_found
            job.queue_size = prog.queue_size
            job.current_url = None
            job.completed_at = utcnow()
            job.duration_ms = int((time.monotonic() - started) * 1000)
            await s.commit()

            sch = await s.get(School, school_id)
            sch.crawl_status = "done"
            sch.total_pages = prog.pages_crawled
            sch.total_docs = prog.docs_found
            sch.last_crawled = utcnow()
            await s.commit()
            await analyze_school(s, sch)
            await s.commit()
        log.info("job %s done: %d pages, %d docs, %d ms", job_id, prog.pages_crawled, prog.docs_found, int((time.monotonic() - started) * 1000))
    except asyncio.CancelledError:
        async with SessionLocal() as s:
            job = await s.get(CrawlJob, job_id)
            if job:
                job.status = "failed"
                job.error = "cancelled"
                job.completed_at = utcnow()
                job.duration_ms = int((time.monotonic() - started) * 1000)
                await s.commit()
        raise
    except Exception as e:  # noqa: BLE001
        log.exception("job %s failed", job_id)
        async with SessionLocal() as s:
            job = await s.get(CrawlJob, job_id)
            if job:
                job.status = "failed"
                job.error = str(e)[:1000]
                job.completed_at = utcnow()
                job.duration_ms = int((time.monotonic() - started) * 1000)
                await s.commit()
            sch = await s.get(School, school_id)
            if sch:
                sch.crawl_status = "failed"
                await s.commit()
    finally:
        _running.pop(job_id, None)


# ----------------------------- routes ----------------------------- #
@app.get("/api/health")
async def health():
    return {"ok": True, "service": "sprxintel-mvp"}


@app.get("/api/stats", response_model=Stats)
async def get_stats():
    async with SessionLocal() as s:
        total_schools = (await s.execute(select(func.count(School.id)))).scalar_one()
        total_pages = (
            await s.execute(select(func.count(Page.id)).where(Page.status_code == 200))
        ).scalar_one()
        total_docs = (await s.execute(select(func.count(Document.id)))).scalar_one()
        active = (await s.execute(select(func.count(CrawlJob.id)).where(CrawlJob.status == "running"))).scalar_one()
        last = (await s.execute(select(CrawlJob.duration_ms).where(CrawlJob.status == "done").order_by(desc(CrawlJob.completed_at)).limit(1))).scalar_one_or_none()
        avg = (total_pages / total_schools) if total_schools else 0
        return Stats(
            total_schools=total_schools,
            total_pages=total_pages,
            total_docs=total_docs,
            avg_pages_per_school=round(avg, 1),
            active_jobs=active,
            last_crawl_ms=last,
        )


@app.post("/api/crawl", response_model=JobOut)
async def start_crawl(req: CrawlRequest):
    school = await _upsert_school(str(req.url), req.name)
    async with SessionLocal() as s:
        job = CrawlJob(
            school_id=school.id,
            status="pending",
            max_pages=req.max_pages,
            concurrency=req.concurrency,
            rate_per_sec=req.rate_per_sec,
        )
        s.add(job)
        await s.commit()
        await s.refresh(job)

    task = asyncio.create_task(_run_crawl(job.id, school.id, req))
    _running[job.id] = task

    async with SessionLocal() as s:
        job = await s.get(CrawlJob, job.id)
        return JobOut.model_validate(job)


@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job(job_id: int):
    t = _running.get(job_id)
    if not t:
        raise HTTPException(404, "job not running")
    t.cancel()
    return {"ok": True}


async def _enrich_school(s, sch: School) -> SchoolOut:
    """Attach last_crawl_ms + pages_per_sec + total_failures, and lazy-fill
    scoring for any done-but-not-yet-analyzed school."""
    if sch.crawl_status == "done" and sch.ai_analyzed_at is None:
        await analyze_school(s, sch)
        await s.commit()
        await s.refresh(sch)

    out = SchoolOut.model_validate(sch)
    last = (
        await s.execute(
            select(CrawlJob)
            .where(CrawlJob.school_id == sch.id, CrawlJob.status == "done")
            .order_by(desc(CrawlJob.completed_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if last and last.duration_ms > 0:
        out.last_crawl_ms = last.duration_ms
        out.pages_per_sec = round(last.pages_crawled / (last.duration_ms / 1000), 2)
    failures = (
        await s.execute(
            select(func.count(Page.id)).where(
                Page.school_id == sch.id, Page.status_code != 200
            )
        )
    ).scalar_one()
    out.total_failures = failures
    return out


@app.get("/api/schools", response_model=list[SchoolOut])
async def list_schools(limit: int = Query(100, le=500)):
    async with SessionLocal() as s:
        rows = (await s.execute(select(School).order_by(desc(School.created_at)).limit(limit))).scalars().all()
        return [await _enrich_school(s, r) for r in rows]


@app.get("/api/schools/{school_id}", response_model=SchoolOut)
async def get_school(school_id: int):
    async with SessionLocal() as s:
        sch = await s.get(School, school_id)
        if not sch:
            raise HTTPException(404, "not found")
        return await _enrich_school(s, sch)


@app.post("/api/schools/{school_id}/analyze", response_model=SchoolOut)
async def analyze_school_endpoint(school_id: int):
    """Force a re-analysis of this school (deterministic content score +
    placeholder AI fields). Useful after content changes."""
    async with SessionLocal() as s:
        sch = await s.get(School, school_id)
        if not sch:
            raise HTTPException(404, "not found")
        await analyze_school(s, sch)
        await s.commit()
        await s.refresh(sch)
        return await _enrich_school(s, sch)


@app.get("/api/schools.csv")
async def schools_csv():
    """CSV export of all schools with timing data."""
    import csv
    import io

    from fastapi.responses import Response

    async with SessionLocal() as s:
        rows = (await s.execute(select(School).order_by(desc(School.created_at)))).scalars().all()
        enriched = [await _enrich_school(s, r) for r in rows]

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "id", "domain", "name", "status", "pages", "docs",
        "last_crawl_seconds", "pages_per_sec", "last_crawled", "seed_url",
    ])
    for r in enriched:
        w.writerow([
            r.id, r.domain, r.name or "", r.crawl_status,
            r.total_pages, r.total_docs,
            round(r.last_crawl_ms / 1000, 2) if r.last_crawl_ms else "",
            r.pages_per_sec or "",
            r.last_crawled.isoformat() if r.last_crawled else "",
            r.seed_url,
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sprxintel-schools.csv"},
    )


@app.get("/api/schools/{school_id}/pages", response_model=list[PageOut])
async def list_pages(school_id: int, limit: int = Query(200, le=2000), q: Optional[str] = None):
    async with SessionLocal() as s:
        stmt = (
            select(Page)
            .where(Page.school_id == school_id, Page.status_code == 200)
            .order_by(Page.id.asc())
            .limit(limit)
        )
        if q:
            stmt = (
                select(Page)
                .where(
                    Page.school_id == school_id,
                    Page.status_code == 200,
                    Page.title.ilike(f"%{q}%"),
                )
                .order_by(Page.id.asc())
                .limit(limit)
            )
        rows = (await s.execute(stmt)).scalars().all()
        return [PageOut.model_validate(r) for r in rows]


@app.get("/api/schools/{school_id}/failures", response_model=list[PageOut])
async def list_failures(school_id: int, limit: int = Query(500, le=2000)):
    async with SessionLocal() as s:
        rows = (
            await s.execute(
                select(Page)
                .where(Page.school_id == school_id, Page.status_code != 200)
                .order_by(Page.status_code.desc(), Page.id.asc())
                .limit(limit)
            )
        ).scalars().all()
        return [PageOut.model_validate(r) for r in rows]


@app.get("/api/schools/{school_id}/documents", response_model=list[DocumentOut])
async def list_documents(school_id: int, limit: int = Query(200, le=1000)):
    async with SessionLocal() as s:
        rows = (await s.execute(select(Document).where(Document.school_id == school_id).order_by(Document.id.asc()).limit(limit))).scalars().all()
        return [DocumentOut.model_validate(r) for r in rows]


@app.get("/api/pages/{page_id}", response_model=PageDetail)
async def get_page(page_id: int):
    async with SessionLocal() as s:
        p = await s.get(Page, page_id)
        if not p:
            raise HTTPException(404, "not found")
        return PageDetail.model_validate(p)


@app.get("/api/jobs", response_model=list[JobOut])
async def list_jobs(limit: int = Query(50, le=200), school_id: Optional[int] = None):
    async with SessionLocal() as s:
        stmt = select(CrawlJob).order_by(desc(CrawlJob.id)).limit(limit)
        if school_id is not None:
            stmt = select(CrawlJob).where(CrawlJob.school_id == school_id).order_by(desc(CrawlJob.id)).limit(limit)
        rows = (await s.execute(stmt)).scalars().all()
        return [JobOut.model_validate(r) for r in rows]


@app.get("/api/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: int):
    async with SessionLocal() as s:
        job = await s.get(CrawlJob, job_id)
        if not job:
            raise HTTPException(404, "not found")
        return JobOut.model_validate(job)
