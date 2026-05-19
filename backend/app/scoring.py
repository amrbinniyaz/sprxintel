"""Deterministic content scoring + placeholder AI analysis.

`compute_content_score` is real — it derives a 0-100 quality score from the
crawl data (meta-desc coverage, word density, failure rate, depth breadth,
document count) and an explanatory health tag.

`dummy_ai_analysis` is a stub that returns plausible, *stable* output keyed
off the school's id — same school always gets the same fake summary,
category, and marketing score. Replace with a real Claude call later; the
return shape matches what the LLM classifier should produce.
"""
from __future__ import annotations

import hashlib
import math

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import Page, School, utcnow

_CATEGORIES = [
    "Boarding K-12",
    "Day School",
    "Higher Education",
    "Online Academy",
    "Independent K-12",
    "Specialty School",
]


def _clip(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


async def _content_score(s: AsyncSession, school: School) -> tuple[int, str]:
    """Returns (score 0-100, health_tag)."""
    rows = (
        await s.execute(
            select(Page.word_count, Page.meta_desc, Page.depth, Page.status_code).where(
                Page.school_id == school.id
            )
        )
    ).all()
    if not rows:
        return 0, "Not analyzed"

    total = len(rows)
    successful = [r for r in rows if r.status_code == 200]
    failure_rate = (total - len(successful)) / total if total else 0

    if not successful:
        return 0, "Thin content"

    avg_words = sum(r.word_count for r in successful) / len(successful)
    meta_pct = sum(1 for r in successful if (r.meta_desc or "").strip()) / len(successful)
    depths = {r.depth for r in successful}
    docs = school.total_docs or 0

    meta_coverage = meta_pct * 100
    word_health = _clip(avg_words / 800 * 100)
    link_health = _clip(100 - failure_rate * 200)
    depth_breadth = _clip(len(depths) * 20)
    doc_signal = _clip(math.log10(docs + 1) * 35)

    score = int(round(
        meta_coverage * 0.25
        + word_health * 0.30
        + link_health * 0.25
        + depth_breadth * 0.10
        + doc_signal * 0.10
    ))

    if failure_rate > 0.15:
        tag = "Many broken links"
    elif score >= 70:
        tag = "Strong content"
    elif score >= 40:
        tag = "Average content"
    else:
        tag = "Thin content"
    return score, tag


def _dummy_ai(school: School) -> dict:
    h = hashlib.md5(f"{school.id}:{school.domain}".encode()).digest()
    category = _CATEGORIES[h[0] % len(_CATEGORIES)]
    marketing_score = 50 + (h[1] % 35)

    name = school.name or school.domain
    posture = "cohesive" if marketing_score >= 65 else "inconsistent"
    summary = (
        f"{name} appears to be a {category.lower()} based at {school.domain}. "
        f"The crawled site covers {school.total_pages} pages and {school.total_docs} linked documents — "
        f"the marketing surface looks {posture}, with room to tighten messaging and CTAs."
    )
    return {
        "summary": summary,
        "category": category,
        "marketing_score": marketing_score,
    }


async def analyze_school(s: AsyncSession, school: School) -> None:
    """Compute + persist scoring fields for one school. Commits on the caller's session."""
    content_score, health_tag = await _content_score(s, school)
    ai = _dummy_ai(school)
    school.content_score = content_score
    school.health_tag = health_tag
    school.marketing_score = ai["marketing_score"]
    school.category_tag = ai["category"]
    school.ai_summary = ai["summary"]
    school.ai_score = int(round(content_score * 0.6 + ai["marketing_score"] * 0.4))
    school.ai_analyzed_at = utcnow()
