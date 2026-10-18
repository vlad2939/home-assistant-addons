"""Import dintr-un link: previzualizare (nimic nu se salvează) și descărcarea pozei la salvare."""

import sqlite3
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .. import db
from ..services import fetch, photos
from ..services import recipes as recipes_service
from ..services.categorize import guess_category
from ..services.scraper import extract_recipe

router = APIRouter(tags=["import"])


class UrlIn(BaseModel):
    url: str = Field(min_length=8, max_length=2000)


def active_sites(conn: sqlite3.Connection) -> list[str]:
    return [r["domain"] for r in conn.execute("SELECT domain FROM import_sites WHERE active = 1 ORDER BY domain")]


def normalize_source(url: str | None) -> str:
    """Același link scris diferit (http/https, www, „/” final, parametri) → aceeași cheie."""
    if not url:
        return ""
    parts = urlsplit(url.strip())
    host = (parts.hostname or "").lower().removeprefix("www.")
    return f"{host}{parts.path.rstrip('/')}".lower()


def find_duplicates(conn: sqlite3.Connection, url: str) -> list[dict]:
    key = normalize_source(url)
    return [
        {"id": r["id"], "title": r["title"]}
        for r in conn.execute("SELECT id, title, source_url FROM recipes WHERE source_url IS NOT NULL")
        if normalize_source(r["source_url"]) == key
    ]


def _decode(raw: bytes, content_type: str) -> str:
    charset = None
    if "charset=" in content_type:
        charset = content_type.split("charset=")[-1].split(";")[0].strip()
    for encoding in filter(None, [charset, "utf-8", "cp1250"]):
        try:
            return raw.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("utf-8", errors="replace")


@router.post("/api/import/preview")
def preview(data: UrlIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    url = fetch.check_url(data.url)
    sites = active_sites(conn)
    host = fetch.host_of(url)
    if not any(fetch.site_matches(host, d) for d in sites):
        raise HTTPException(
            403,
            f"Site-ul {host.removeprefix('www.')} nu este în lista site-urilor permise pentru import. "
            "Îl poți adăuga din Setări.",
        )
    raw, final_url, content_type = fetch.download(url, allowed=lambda h: any(fetch.site_matches(h, d) for d in sites))
    if content_type and "html" not in content_type:
        raise HTTPException(422, "Linkul nu duce la o pagină web cu rețetă.")
    draft = extract_recipe(_decode(raw, content_type), final_url)
    draft["category_id"] = guess_category(conn, draft["title"])
    return {"draft": draft, "duplicates": find_duplicates(conn, final_url) or find_duplicates(conn, url)}


@router.post("/api/recipes/{recipe_id}/photo-from-url")
def photo_from_url(recipe_id: int, data: UrlIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Descarcă poza rețetei importate (poate fi pe alt domeniu, ex. un CDN), doar de pe adrese publice."""
    old = recipes_service.get_recipe(conn, recipe_id)["photo"]
    raw, _, content_type = fetch.download(data.url, max_bytes=photos.MAX_UPLOAD_BYTES)
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(422, "Linkul pozei nu duce la o imagine.")
    name = photos.save_photo(raw)
    with conn:
        conn.execute(
            "UPDATE recipes SET photo = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now') WHERE id = ?",
            (name, recipe_id),
        )
    photos.delete_photo(old)
    return {"photo": name}
