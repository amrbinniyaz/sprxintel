from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


class CrawlRequest(BaseModel):
    url: HttpUrl
    name: Optional[str] = None
    max_pages: int = 500
    concurrency: int = 10
    rate_per_sec: float = 2.0


class SchoolOut(BaseModel):
    id: int
    domain: str
    name: Optional[str]
    seed_url: str
    crawl_status: str
    total_pages: int
    total_docs: int
    total_failures: int = 0
    last_crawled: Optional[datetime]
    last_crawl_ms: Optional[int] = None
    pages_per_sec: Optional[float] = None
    created_at: datetime

    ai_summary: Optional[str] = None
    ai_score: Optional[int] = None
    content_score: Optional[int] = None
    marketing_score: Optional[int] = None
    category_tag: Optional[str] = None
    health_tag: Optional[str] = None
    ai_analyzed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PageOut(BaseModel):
    id: int
    school_id: int
    url: str
    title: Optional[str]
    meta_desc: Optional[str]
    word_count: int
    status_code: int
    fetch_ms: int
    depth: int
    crawled_at: datetime

    class Config:
        from_attributes = True


class PageDetail(PageOut):
    headings: Optional[dict]
    body_markdown: Optional[str]


class DocumentOut(BaseModel):
    id: int
    url: str
    file_type: Optional[str]
    discovered_at: datetime

    class Config:
        from_attributes = True


class JobOut(BaseModel):
    id: int
    school_id: int
    status: str
    max_pages: int
    concurrency: int
    rate_per_sec: float
    pages_crawled: int
    pages_failed: int
    docs_found: int
    queue_size: int
    current_url: Optional[str]
    error: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_ms: int
    created_at: datetime

    class Config:
        from_attributes = True


class Stats(BaseModel):
    total_schools: int
    total_pages: int
    total_docs: int
    avg_pages_per_school: float
    active_jobs: int
    last_crawl_ms: Optional[int]
