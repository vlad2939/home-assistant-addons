"""Lista de rețete: căutare full-text, filtre combinabile, sortare."""

import re
import sqlite3
from dataclasses import dataclass, field

from ..text import fix_romanian, normalize
from .recipes import total_time

SORTS = ("relevance", "recent", "updated", "title", "time")

# Ponderi bm25 pentru coloanele (titlu, descriere, ingrediente, tag-uri): titlul contează cel mai mult.
_RANK = "bm25(recipes_fts, 10.0, 2.0, 4.0, 4.0)"

_ORDER = {
    "recent": "r.created_at DESC, r.id DESC",
    "updated": "r.updated_at DESC, r.id DESC",
    "title": "r.title COLLATE ro, r.id",
    "time": "(coalesce(r.prep_time, 0) + coalesce(r.cook_time, 0)) = 0, "
    "coalesce(r.prep_time, 0) + coalesce(r.cook_time, 0), r.title COLLATE ro",
}


@dataclass
class Filters:
    q: str | None = None
    category: int | None = None
    ingredients: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    source: str | None = None
    favorite: bool | None = None
    sort: str | None = None
    video: bool | None = None
    own: bool | None = None


def fts_query(text: str | None) -> str | None:
    """Transformă textul liber într-o interogare FTS5 sigură: fiecare cuvânt e prefix, toate obligatorii."""
    words = re.findall(r"\w+", normalize(text))
    return " ".join(f'"{w}"*' for w in words) or None


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_recipes(conn: sqlite3.Connection, f: Filters) -> list[dict]:
    where, params, joins = [], [], ""
    match = fts_query(f.q)
    if match:
        joins = f"JOIN (SELECT rowid, {_RANK} AS score FROM recipes_fts WHERE recipes_fts MATCH ?) s ON s.rowid = r.id"
        params.append(match)
    if f.category is not None:
        where.append("r.category_id = ?")
        params.append(f.category)
    for ing in f.ingredients:
        if norm := normalize(ing):
            where.append(
                "EXISTS (SELECT 1 FROM recipe_ingredients i WHERE i.recipe_id = r.id "
                "AND i.name_normalized LIKE ? ESCAPE '\\')"
            )
            params.append(f"%{_like_escape(norm)}%")
    for tag in f.tags:
        if tag := fix_romanian(tag):
            where.append(
                "EXISTS (SELECT 1 FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id "
                "WHERE rt.recipe_id = r.id AND t.name = ?)"
            )
            params.append(tag.lower())
    if f.source:
        where.append("r.source_site = ?")
        params.append(f.source)
    if f.favorite is not None:
        where.append("r.favorite = ?")
        params.append(int(f.favorite))
    if f.own is not None:
        where.append("r.own = ?")
        params.append(int(f.own))
    if f.video is not None:
        where.append("r.video_url IS NOT NULL" if f.video else "r.video_url IS NULL")

    sort = f.sort if f.sort in SORTS else None
    if sort is None:
        sort = "relevance" if match else "recent"
    order = "s.score, r.id DESC" if sort == "relevance" and match else _ORDER.get(sort, _ORDER["recent"])

    sql = f"""
        SELECT r.id, r.title, r.description, r.photo, r.prep_time, r.cook_time, r.servings,
               r.favorite, r.own, r.category_id, c.name AS category_name, r.source_site,
               r.created_at, r.updated_at
        FROM recipes r {joins}
        LEFT JOIN categories c ON c.id = r.category_id
        {"WHERE " + " AND ".join(where) if where else ""}
        ORDER BY {order}
    """
    items = [dict(r) for r in conn.execute(sql, params)]
    tags = _tags_for(conn, [i["id"] for i in items])
    for item in items:
        item["favorite"] = bool(item["favorite"])
        item["own"] = bool(item["own"])
        item["total_time"] = total_time(item["prep_time"], item["cook_time"])
        item["tags"] = tags.get(item["id"], [])
    return items


def _tags_for(conn: sqlite3.Connection, ids: list[int]) -> dict[int, list[str]]:
    if not ids:
        return {}
    result: dict[int, list[str]] = {}
    marks = ",".join("?" for _ in ids)
    for row in conn.execute(
        f"""SELECT rt.recipe_id, t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
            WHERE rt.recipe_id IN ({marks}) ORDER BY t.name COLLATE ro""",
        ids,
    ):
        result.setdefault(row["recipe_id"], []).append(row["name"])
    return result
