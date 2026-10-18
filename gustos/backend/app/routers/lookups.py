"""Liste pentru filtre și autocompletare: tag-uri, ingrediente, surse, statistici."""

import sqlite3

from fastapi import APIRouter, Depends

from .. import db
from ..text import normalize

router = APIRouter(prefix="/api", tags=["lookups"])


def _like_prefix(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@router.get("/tags")
def tags(prefix: str | None = None, conn: sqlite3.Connection = Depends(db.get_conn)):
    rows = conn.execute(
        """SELECT t.id, t.name, COUNT(rt.recipe_id) AS recipe_count
           FROM tags t LEFT JOIN recipe_tags rt ON rt.tag_id = t.id
           GROUP BY t.id ORDER BY t.name COLLATE ro"""
    ).fetchall()
    items = [dict(r) for r in rows]
    if prefix and (p := normalize(prefix)):
        items = [t for t in items if normalize(t["name"]).startswith(p)]
    return items


@router.get("/ingredients")
def ingredients(prefix: str = "", limit: int = 20, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Autocompletare doar din ingredientele existente; potrivire la începutul oricărui cuvânt."""
    p = normalize(prefix)
    if not p:
        return []
    rows = conn.execute(
        """SELECT name_normalized, MIN(name) AS name, COUNT(DISTINCT recipe_id) AS recipe_count
           FROM recipe_ingredients
           WHERE name_normalized LIKE ? ESCAPE '\\' OR name_normalized LIKE ? ESCAPE '\\'
           GROUP BY name_normalized
           ORDER BY name_normalized NOT LIKE ? ESCAPE '\\', recipe_count DESC, name_normalized
           LIMIT ?""",
        (_like_prefix(p), "% " + _like_prefix(p), _like_prefix(p), max(1, min(limit, 50))),
    ).fetchall()
    return [{"name": r["name"], "recipe_count": r["recipe_count"]} for r in rows]


@router.get("/sources")
def sources(conn: sqlite3.Connection = Depends(db.get_conn)):
    rows = conn.execute(
        "SELECT source_site, COUNT(*) AS recipe_count FROM recipes GROUP BY source_site ORDER BY source_site"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/stats")
def stats(conn: sqlite3.Connection = Depends(db.get_conn)):
    def one(sql: str) -> int:
        return conn.execute(sql).fetchone()[0]

    return {
        "recipes": one("SELECT COUNT(*) FROM recipes"),
        "favorites": one("SELECT COUNT(*) FROM recipes WHERE favorite = 1"),
        "uncategorized": one("SELECT COUNT(*) FROM recipes WHERE category_id IS NULL"),
        "categories": one("SELECT COUNT(*) FROM categories"),
        "tags": one("SELECT COUNT(*) FROM tags"),
    }
