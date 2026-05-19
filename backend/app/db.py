"""SQLite storage layer. Single local file — swap for Postgres+pgvector later."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "sprxintel.db"
DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class School(Base):
    __tablename__ = "schools"
    id: Mapped[int] = mapped_column(primary_key=True)
    domain: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    seed_url: Mapped[str] = mapped_column(String)
    country: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    crawl_status: Mapped[str] = mapped_column(String, default="pending")  # pending/running/done/failed
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    total_docs: Mapped[int] = mapped_column(Integer, default=0)
    last_crawled: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # AI / scoring fields. content_* are deterministic; marketing_* + category +
    # summary are placeholder stubs until the LLM pass is wired in (see scoring.py).
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    marketing_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category_tag: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    health_tag: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ai_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    pages: Mapped[list["Page"]] = relationship(back_populates="school", cascade="all,delete")
    documents: Mapped[list["Document"]] = relationship(back_populates="school", cascade="all,delete")
    jobs: Mapped[list["CrawlJob"]] = relationship(back_populates="school", cascade="all,delete")


class Page(Base):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("school_id", "url", name="uq_pages_school_url"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    meta_desc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    headings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    status_code: Mapped[int] = mapped_column(Integer, default=0)
    content_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    fetch_ms: Mapped[int] = mapped_column(Integer, default=0)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    crawled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    school: Mapped[School] = relationship(back_populates="pages")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("school_id", "url", name="uq_documents_school_url"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String, index=True)
    file_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    school: Mapped[School] = relationship(back_populates="documents")


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending/running/done/failed
    max_pages: Mapped[int] = mapped_column(Integer, default=500)
    concurrency: Mapped[int] = mapped_column(Integer, default=10)
    rate_per_sec: Mapped[float] = mapped_column(Integer, default=2)
    pages_crawled: Mapped[int] = mapped_column(Integer, default=0)
    pages_failed: Mapped[int] = mapped_column(Integer, default=0)
    docs_found: Mapped[int] = mapped_column(Integer, default=0)
    queue_size: Mapped[int] = mapped_column(Integer, default=0)
    current_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    school: Mapped[School] = relationship(back_populates="jobs")


engine = create_async_engine(DB_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


_SCHOOL_NEW_COLUMNS: list[tuple[str, str]] = [
    ("ai_summary", "TEXT"),
    ("ai_score", "INTEGER"),
    ("content_score", "INTEGER"),
    ("marketing_score", "INTEGER"),
    ("category_tag", "TEXT"),
    ("health_tag", "TEXT"),
    ("ai_analyzed_at", "DATETIME"),
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent migration for the AI/scoring columns on schools.
        # SQLite has no IF NOT EXISTS for ADD COLUMN, so diff against table_info.
        result = await conn.execute(text("PRAGMA table_info(schools)"))
        existing = {row[1] for row in result.fetchall()}
        for name, type_ in _SCHOOL_NEW_COLUMNS:
            if name not in existing:
                await conn.execute(text(f"ALTER TABLE schools ADD COLUMN {name} {type_}"))
