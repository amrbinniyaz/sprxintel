"""Async crawler: httpx + BeautifulSoup. Same-domain BFS, sitemap-seeded, robots-aware,
per-domain rate limited. Designed to be swappable with Crawl4AI later.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Callable, Iterable, Optional
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree as ET

import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as html_to_md

log = logging.getLogger("crawler")

USER_AGENT = "SprXintelBot/0.1 (+https://interactiveschools.com; pilot crawl)"
DEFAULT_TIMEOUT = 20.0
SKIP_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
    ".mp4", ".mp3", ".wav", ".mov", ".avi", ".webm",
    ".zip", ".tar", ".gz", ".rar", ".7z",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
}
DOC_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
HTML_CONTENT_TYPES = ("text/html", "application/xhtml+xml")


@dataclass
class PageResult:
    url: str
    status_code: int
    title: Optional[str] = None
    meta_desc: Optional[str] = None
    headings: dict = field(default_factory=dict)
    body_text: str = ""
    body_markdown: str = ""
    word_count: int = 0
    content_type: Optional[str] = None
    fetch_ms: int = 0
    depth: int = 0
    links: list[str] = field(default_factory=list)
    docs: list[tuple[str, str]] = field(default_factory=list)  # (url, file_type)


@dataclass
class CrawlProgress:
    pages_crawled: int = 0
    pages_failed: int = 0
    docs_found: int = 0
    queue_size: int = 0
    current_url: Optional[str] = None
    finished: bool = False
    error: Optional[str] = None
    elapsed_ms: int = 0


def normalize_url(url: str, base: str | None = None) -> str | None:
    if not url:
        return None
    url = url.strip()
    if url.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    if base:
        url = urljoin(base, url)
    url, _frag = urldefrag(url)
    if not url.startswith(("http://", "https://")):
        return None
    # lowercase scheme + host
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    # drop common trailing slash inconsistency root
    path = parsed.path or "/"
    rebuilt = f"{parsed.scheme.lower()}://{netloc}{path}"
    if parsed.query:
        rebuilt += f"?{parsed.query}"
    return rebuilt


def same_registrable_domain(a: str, b: str) -> bool:
    """Compare hosts ignoring www. — keeps the crawl on the same property."""
    import tldextract

    ea = tldextract.extract(a)
    eb = tldextract.extract(b)
    return (ea.domain, ea.suffix) == (eb.domain, eb.suffix)


def url_extension(url: str) -> str:
    path = urlparse(url).path.lower()
    m = re.search(r"\.[a-z0-9]{1,5}$", path)
    return m.group(0) if m else ""


class TokenBucket:
    """Simple per-domain rate limiter — N requests per second."""

    def __init__(self, rate_per_sec: float):
        self.rate = max(rate_per_sec, 0.1)
        self.interval = 1.0 / self.rate
        self._lock = asyncio.Lock()
        self._next_allowed = 0.0

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            if self._next_allowed > now:
                await asyncio.sleep(self._next_allowed - now)
                now = time.monotonic()
            self._next_allowed = max(now, self._next_allowed) + self.interval


class Crawler:
    def __init__(
        self,
        seed_url: str,
        *,
        max_pages: int = 500,
        concurrency: int = 10,
        rate_per_sec: float = 2.0,
        respect_robots: bool = True,
        on_page: Optional[Callable[[PageResult], "asyncio.Future | None"]] = None,
        on_progress: Optional[Callable[[CrawlProgress], "asyncio.Future | None"]] = None,
    ):
        self.seed_url = normalize_url(seed_url) or seed_url
        self.host = urlparse(self.seed_url).netloc
        self.max_pages = max_pages
        self.concurrency = concurrency
        self.bucket = TokenBucket(rate_per_sec)
        self.respect_robots = respect_robots
        self.on_page = on_page
        self.on_progress = on_progress

        self.queue: asyncio.Queue[tuple[str, int]] = asyncio.Queue()
        self.seen: set[str] = set()
        self.docs_seen: set[str] = set()
        self.progress = CrawlProgress()
        self.robots: Optional[RobotFileParser] = None
        self._started_mono = 0.0

    # ---------------------------- discovery ---------------------------- #
    async def _load_robots(self, client: httpx.AsyncClient) -> None:
        if not self.respect_robots:
            return
        parsed = urlparse(self.seed_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        try:
            r = await client.get(robots_url, timeout=DEFAULT_TIMEOUT)
            if r.status_code == 200:
                rp.parse(r.text.splitlines())
                self.robots = rp
                log.info("robots.txt loaded from %s", robots_url)
        except Exception as e:  # noqa: BLE001
            log.warning("robots.txt fetch failed: %s", e)

    def _allowed(self, url: str) -> bool:
        if self.robots is None:
            return True
        try:
            return self.robots.can_fetch(USER_AGENT, url)
        except Exception:  # noqa: BLE001
            return True

    async def _seed_from_sitemap(self, client: httpx.AsyncClient) -> int:
        """Try common sitemap locations + robots.txt 'Sitemap:' directive."""
        parsed = urlparse(self.seed_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        candidates = [
            f"{base}/sitemap.xml",
            f"{base}/sitemap_index.xml",
            f"{base}/sitemap-index.xml",
        ]
        # robots.txt sitemap line
        if self.robots is not None:
            try:
                sitemaps = self.robots.site_maps() or []
                candidates = list(sitemaps) + candidates
            except Exception:  # noqa: BLE001
                pass

        seeded = 0
        tried: set[str] = set()
        for sm in candidates:
            if sm in tried:
                continue
            tried.add(sm)
            urls = await self._parse_sitemap(client, sm, depth=0)
            for u in urls:
                if seeded >= self.max_pages * 2:
                    break
                if u in self.seen:
                    continue
                self.seen.add(u)
                await self.queue.put((u, 1))
                seeded += 1
            if seeded:
                log.info("seeded %d URLs from %s", seeded, sm)
                break
        return seeded

    async def _parse_sitemap(
        self, client: httpx.AsyncClient, url: str, *, depth: int
    ) -> list[str]:
        if depth > 2:
            return []
        try:
            r = await client.get(url, timeout=DEFAULT_TIMEOUT)
            if r.status_code != 200 or not r.text.strip():
                return []
        except Exception:  # noqa: BLE001
            return []

        try:
            root = ET.fromstring(r.text)
        except ET.ParseError:
            return []

        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls: list[str] = []
        # sitemap index
        for sm in root.findall("sm:sitemap", ns):
            loc = sm.findtext("sm:loc", default="", namespaces=ns)
            if loc:
                urls.extend(await self._parse_sitemap(client, loc, depth=depth + 1))
        # urlset
        for u in root.findall("sm:url", ns):
            loc = u.findtext("sm:loc", default="", namespaces=ns)
            n = normalize_url(loc)
            if n and same_registrable_domain(n, self.seed_url):
                ext = url_extension(n)
                if ext in SKIP_EXTENSIONS:
                    continue
                if ext in DOC_EXTENSIONS:
                    self.docs_seen.add(n)
                    continue
                urls.append(n)
        return urls

    # ---------------------------- fetch + parse ---------------------------- #
    async def _fetch(
        self, client: httpx.AsyncClient, url: str
    ) -> tuple[Optional[httpx.Response], int]:
        await self.bucket.acquire()
        t0 = time.monotonic()
        try:
            r = await client.get(url, timeout=DEFAULT_TIMEOUT, follow_redirects=True)
            ms = int((time.monotonic() - t0) * 1000)
            return r, ms
        except (httpx.TimeoutException, httpx.RequestError) as e:
            ms = int((time.monotonic() - t0) * 1000)
            log.debug("fetch error %s: %s", url, e)
            return None, ms

    def _parse_html(self, html: str, url: str) -> PageResult:
        soup = BeautifulSoup(html, "lxml")

        # strip non-content + chrome we never want indexed
        for tag in soup(["script", "style", "noscript", "template", "nav", "header", "footer", "aside"]):
            tag.decompose()

        title = (soup.title.string.strip() if soup.title and soup.title.string else None)
        meta_desc = None
        md = soup.find("meta", attrs={"name": "description"})
        if md and md.get("content"):
            meta_desc = md["content"].strip()

        headings: dict[str, list[str]] = {}
        for level in ("h1", "h2", "h3"):
            vals = [h.get_text(" ", strip=True) for h in soup.find_all(level)]
            if vals:
                headings[level] = vals[:20]

        # Pick the container with the most text. Some sites have <main> and
        # <article> both present where one is the actual content and the
        # other is a navigation/chrome shell (Westminster does this).
        candidates = [
            soup.find("main"),
            soup.find("article"),
            soup.find(attrs={"role": "main"}),
            soup.find(id=re.compile(r"(content|main)", re.I)),
            soup.body,
        ]
        candidates = [c for c in candidates if c is not None]
        best = max(
            candidates,
            key=lambda c: len(c.get_text(" ", strip=True).split()),
            default=soup,
        )
        body_text = re.sub(r"\s+", " ", best.get_text(" ", strip=True))
        body_markdown = html_to_md(str(best), heading_style="ATX", strip=["a"])[:120_000]
        word_count = len(body_text.split())

        links: list[str] = []
        docs: list[tuple[str, str]] = []
        for a in soup.find_all("a", href=True):
            n = normalize_url(a["href"], base=url)
            if not n:
                continue
            ext = url_extension(n)
            if ext in DOC_EXTENSIONS:
                docs.append((n, ext.lstrip(".")))
                continue
            if ext in SKIP_EXTENSIONS:
                continue
            links.append(n)

        return PageResult(
            url=url,
            status_code=200,
            title=title,
            meta_desc=meta_desc,
            headings=headings,
            body_text=body_text[:200_000],
            body_markdown=body_markdown,
            word_count=word_count,
            links=links,
            docs=docs,
        )

    # ---------------------------- worker ---------------------------- #
    async def _worker(self, client: httpx.AsyncClient) -> None:
        while True:
            try:
                url, depth = await asyncio.wait_for(self.queue.get(), timeout=2.0)
            except asyncio.TimeoutError:
                if self.queue.empty():
                    return
                continue

            try:
                if self.progress.pages_crawled >= self.max_pages:
                    return
                if not self._allowed(url):
                    log.debug("blocked by robots: %s", url)
                    continue
                self.progress.current_url = url

                r, fetch_ms = await self._fetch(client, url)
                if r is None or r.status_code >= 400:
                    self.progress.pages_failed += 1
                    result = PageResult(
                        url=url,
                        status_code=r.status_code if r else 0,
                        fetch_ms=fetch_ms,
                        depth=depth,
                    )
                    if self.on_page:
                        await _maybe_await(self.on_page(result))
                    continue

                ctype = r.headers.get("content-type", "").split(";")[0].strip().lower()
                if not any(ctype.startswith(t) for t in HTML_CONTENT_TYPES):
                    # not HTML; skip but record as doc if PDF-ish
                    if "pdf" in ctype:
                        self.docs_seen.add(url)
                        self.progress.docs_found = len(self.docs_seen)
                    continue

                result = self._parse_html(r.text, url)
                result.status_code = r.status_code
                result.content_type = ctype
                result.fetch_ms = fetch_ms
                result.depth = depth

                # enqueue new links
                for link in result.links:
                    if (
                        link in self.seen
                        or not same_registrable_domain(link, self.seed_url)
                    ):
                        continue
                    if len(self.seen) >= self.max_pages * 4:
                        break
                    self.seen.add(link)
                    await self.queue.put((link, depth + 1))

                for doc_url, _ftype in result.docs:
                    self.docs_seen.add(doc_url)
                self.progress.docs_found = len(self.docs_seen)

                self.progress.pages_crawled += 1
                if self.on_page:
                    await _maybe_await(self.on_page(result))

                # progress tick every 10 pages
                if self.progress.pages_crawled % 10 == 0 and self.on_progress:
                    self.progress.queue_size = self.queue.qsize()
                    self.progress.elapsed_ms = int((time.monotonic() - self._started_mono) * 1000)
                    await _maybe_await(self.on_progress(self.progress))
            finally:
                self.queue.task_done()

    # ---------------------------- public entrypoint ---------------------------- #
    async def run(self) -> CrawlProgress:
        self._started_mono = time.monotonic()
        headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
        limits = httpx.Limits(max_connections=self.concurrency * 2, max_keepalive_connections=self.concurrency)
        async with httpx.AsyncClient(headers=headers, limits=limits, http2=False) as client:
            await self._load_robots(client)
            seeded = await self._seed_from_sitemap(client)
            if seeded == 0:
                # fall back to homepage
                self.seen.add(self.seed_url)
                await self.queue.put((self.seed_url, 0))
                log.info("no sitemap; seeding from homepage")

            tasks = [asyncio.create_task(self._worker(client)) for _ in range(self.concurrency)]
            try:
                # Wait until queue drains or page cap reached
                while True:
                    await asyncio.sleep(0.5)
                    if self.progress.pages_crawled >= self.max_pages:
                        break
                    if self.queue.empty() and all(t.done() for t in tasks):
                        break
                    # also break if queue empty for a while AND no in-flight
                    if self.queue.empty():
                        # Give workers a brief moment to finish their last items
                        await asyncio.sleep(1.0)
                        if self.queue.empty():
                            break
            finally:
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)

        self.progress.queue_size = self.queue.qsize()
        self.progress.docs_found = len(self.docs_seen)
        self.progress.finished = True
        self.progress.elapsed_ms = int((time.monotonic() - self._started_mono) * 1000)
        if self.on_progress:
            await _maybe_await(self.on_progress(self.progress))
        return self.progress


async def _maybe_await(x):
    if asyncio.iscoroutine(x):
        return await x
    return x
