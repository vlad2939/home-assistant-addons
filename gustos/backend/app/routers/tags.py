"""Tag-uri: lista (cu numărul de rețete), redenumirea / unirea și ștergerea lor."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from .. import db
from ..schemas import TagIn
from ..services.recipes import sync_fts
from ..text import normalize

router = APIRouter(prefix="/api/tags", tags=["tags"])


def _all(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT t.id, t.name, COUNT(rt.recipe_id) AS recipe_count
           FROM tags t LEFT JOIN recipe_tags rt ON rt.tag_id = t.id
           GROUP BY t.id ORDER BY t.name COLLATE ro"""
    ).fetchall()
    return [dict(r) for r in rows]


def _require(conn: sqlite3.Connection, tag_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT id, name FROM tags WHERE id = ?", (tag_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Tag-ul nu există.")
    return row


def _recipes_with(conn: sqlite3.Connection, tag_id: int) -> list[int]:
    return [r[0] for r in conn.execute("SELECT recipe_id FROM recipe_tags WHERE tag_id = ?", (tag_id,))]


@router.get("")
def list_tags(prefix: str | None = None, conn: sqlite3.Connection = Depends(db.get_conn)):
    items = _all(conn)
    if prefix and (p := normalize(prefix)):
        items = [t for t in items if normalize(t["name"]).startswith(p)]
    return items


@router.put("/{tag_id}")
def rename(tag_id: int, data: TagIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Redenumește tag-ul. Dacă noul nume există deja (ex. „Post” și „post”), cele două tag-uri se unesc."""
    _require(conn, tag_id)
    name = data.name.lower()
    same = next(
        (r for r in conn.execute("SELECT id, name FROM tags WHERE id != ?", (tag_id,)) if normalize(r["name"]) == normalize(name)),
        None,
    )
    recipe_ids = _recipes_with(conn, tag_id)
    with conn:
        if same:
            conn.execute(
                "INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) SELECT recipe_id, ? FROM recipe_tags WHERE tag_id = ?",
                (same["id"], tag_id),
            )
            conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        else:
            conn.execute("UPDATE tags SET name = ? WHERE id = ?", (name, tag_id))
        for recipe_id in recipe_ids:
            sync_fts(conn, recipe_id)
    return {"merged_into": same["id"] if same else None, "tags": _all(conn)}


@router.delete("/{tag_id}", status_code=204)
def delete(tag_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Scoate tag-ul de pe toate rețetele (rețetele rămân)."""
    _require(conn, tag_id)
    recipe_ids = _recipes_with(conn, tag_id)
    with conn:
        conn.execute("DELETE FROM recipe_tags WHERE tag_id = ?", (tag_id,))
        conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        for recipe_id in recipe_ids:
            sync_fts(conn, recipe_id)
    return Response(status_code=204)
