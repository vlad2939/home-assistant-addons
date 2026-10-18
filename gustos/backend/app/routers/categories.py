import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from .. import db
from ..schemas import CategoryIn, CategoryOrder
from ..text import normalize

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _all(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """SELECT c.id, c.name, c.position, COUNT(r.id) AS recipe_count
           FROM categories c LEFT JOIN recipes r ON r.category_id = c.id
           GROUP BY c.id ORDER BY c.position, c.name COLLATE ro"""
    ).fetchall()
    return [dict(r) for r in rows]


def _get(conn: sqlite3.Connection, category_id: int) -> dict:
    for c in _all(conn):
        if c["id"] == category_id:
            return c
    raise HTTPException(404, "Categoria nu există.")


def _check_unique(conn: sqlite3.Connection, name: str, exclude_id: int | None = None) -> None:
    """„Mic dejun” și „mic dejun” sau „Băuturi” și „Bauturi” sunt considerate același nume."""
    for row in conn.execute("SELECT id, name FROM categories"):
        if row["id"] != exclude_id and normalize(row["name"]) == normalize(name):
            raise HTTPException(409, f"Există deja categoria „{row['name']}”.")


@router.get("")
def list_categories(conn: sqlite3.Connection = Depends(db.get_conn)):
    return _all(conn)


@router.post("", status_code=201)
def create(data: CategoryIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    _check_unique(conn, data.name)
    with conn:
        new_id = conn.execute(
            "INSERT INTO categories (name, position) SELECT ?, coalesce(MAX(position), 0) + 1 FROM categories",
            (data.name,),
        ).lastrowid
    return _get(conn, new_id)


@router.put("/order")
def reorder(data: CategoryOrder, conn: sqlite3.Connection = Depends(db.get_conn)):
    existing = {r["id"] for r in conn.execute("SELECT id FROM categories")}
    if sorted(data.ids) != sorted(existing):
        raise HTTPException(422, "Lista pentru reordonare trebuie să conțină toate categoriile, o singură dată.")
    with conn:
        conn.executemany(
            "UPDATE categories SET position = ? WHERE id = ?",
            [(pos, cid) for pos, cid in enumerate(data.ids, start=1)],
        )
    return _all(conn)


@router.put("/{category_id}")
def rename(category_id: int, data: CategoryIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    _get(conn, category_id)
    _check_unique(conn, data.name, exclude_id=category_id)
    with conn:
        conn.execute("UPDATE categories SET name = ? WHERE id = ?", (data.name, category_id))
    return _get(conn, category_id)


@router.delete("/{category_id}", status_code=204)
def delete(category_id: int, move_to: int | None = None, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Șterge categoria. Dacă are rețete, ele trebuie mutate (move_to) în altă categorie."""
    category = _get(conn, category_id)
    with conn:
        if category["recipe_count"]:
            if move_to is None:
                raise HTTPException(
                    409,
                    f"Categoria „{category['name']}” are {category['recipe_count']} rețete. "
                    "Alege categoria în care să fie mutate.",
                )
            if move_to == category_id:
                raise HTTPException(422, "Rețetele trebuie mutate în altă categorie.")
            _get(conn, move_to)
            conn.execute("UPDATE recipes SET category_id = ? WHERE category_id = ?", (move_to, category_id))
        conn.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    return Response(status_code=204)
