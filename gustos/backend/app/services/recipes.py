"""Salvarea și citirea rețetelor (cu ingrediente, pași, tag-uri) și sincronizarea căutării."""

import sqlite3
from urllib.parse import urlsplit

from fastapi import HTTPException

from ..schemas import RecipeIn
from ..text import normalize
from . import photos

_NOW = "strftime('%Y-%m-%dT%H:%M:%S', 'now')"

_RECIPE_FIELDS = [
    "title", "description", "servings", "prep_time", "cook_time", "difficulty", "category_id",
    "tips", "notes", "source_url", "video_url", "own", "source_site", "original_language", "calories_per_serving",
]


def site_from_url(url: str | None) -> str:
    if not url:
        return "manual"
    host = (urlsplit(url).hostname or "").lower()
    return host.removeprefix("www.") or "manual"


def _values(conn: sqlite3.Connection, data: RecipeIn) -> dict:
    if data.category_id is not None:
        if not conn.execute("SELECT 1 FROM categories WHERE id = ?", (data.category_id,)).fetchone():
            raise HTTPException(422, "Categoria aleasă nu există.")
    values = {f: getattr(data, f) for f in _RECIPE_FIELDS}
    values["own"] = int(data.own)
    if not values["source_site"]:
        values["source_site"] = site_from_url(data.source_url)
    return values


def _write_children(conn: sqlite3.Connection, recipe_id: int, data: RecipeIn) -> None:
    conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", (recipe_id,))
    conn.execute("DELETE FROM recipe_steps WHERE recipe_id = ?", (recipe_id,))
    conn.execute("DELETE FROM recipe_tags WHERE recipe_id = ?", (recipe_id,))

    conn.executemany(
        """INSERT INTO recipe_ingredients
           (recipe_id, group_name, position, quantity, quantity_text, unit, name, name_normalized, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (recipe_id, i.group_name, pos, i.quantity, i.quantity_text, i.unit, i.name, normalize(i.name), i.note)
            for pos, i in enumerate(data.ingredients, start=1)
        ],
    )
    conn.executemany(
        "INSERT INTO recipe_steps (recipe_id, position, text) VALUES (?, ?, ?)",
        [(recipe_id, pos, text) for pos, text in enumerate(data.steps, start=1)],
    )
    for tag in data.tags:
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag,))
        conn.execute(
            "INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) SELECT ?, id FROM tags WHERE name = ?",
            (recipe_id, tag),
        )
    sync_fts(conn, recipe_id)
    _delete_unused_tags(conn)


def sync_fts(conn: sqlite3.Connection, recipe_id: int) -> None:
    conn.execute("DELETE FROM recipes_fts WHERE rowid = ?", (recipe_id,))
    conn.execute(
        """INSERT INTO recipes_fts (rowid, title, description, ingredients, tags)
           SELECT r.id, r.title, coalesce(r.description, ''),
                  coalesce((SELECT group_concat(name, ' ') FROM recipe_ingredients WHERE recipe_id = r.id), ''),
                  coalesce((SELECT group_concat(t.name, ' ') FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
                            WHERE rt.recipe_id = r.id), '')
           FROM recipes r WHERE r.id = ?""",
        (recipe_id,),
    )


def _delete_unused_tags(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM recipe_tags)")


def create_recipe(conn: sqlite3.Connection, data: RecipeIn) -> int:
    values = _values(conn, data)
    with conn:
        cols = ", ".join(values)
        marks = ", ".join("?" for _ in values)
        recipe_id = conn.execute(f"INSERT INTO recipes ({cols}) VALUES ({marks})", list(values.values())).lastrowid
        _write_children(conn, recipe_id, data)
    return recipe_id


def update_recipe(conn: sqlite3.Connection, recipe_id: int, data: RecipeIn) -> None:
    _require(conn, recipe_id)
    values = _values(conn, data)
    with conn:
        assignments = ", ".join(f"{c} = ?" for c in values)
        conn.execute(
            f"UPDATE recipes SET {assignments}, updated_at = {_NOW} WHERE id = ?",
            [*values.values(), recipe_id],
        )
        _write_children(conn, recipe_id, data)


def delete_recipe(conn: sqlite3.Connection, recipe_id: int) -> None:
    photo = _require(conn, recipe_id)["photo"]
    with conn:
        conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
        conn.execute("DELETE FROM recipes_fts WHERE rowid = ?", (recipe_id,))
        _delete_unused_tags(conn)
    photos.delete_photo(photo)


def toggle_favorite(conn: sqlite3.Connection, recipe_id: int) -> bool:
    _require(conn, recipe_id)
    with conn:
        conn.execute("UPDATE recipes SET favorite = 1 - favorite WHERE id = ?", (recipe_id,))
    return bool(conn.execute("SELECT favorite FROM recipes WHERE id = ?", (recipe_id,)).fetchone()[0])


def _require(conn: sqlite3.Connection, recipe_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Rețeta nu există.")
    return row


def total_time(prep: int | None, cook: int | None) -> int | None:
    if prep is None and cook is None:
        return None
    return (prep or 0) + (cook or 0)


def get_recipe(conn: sqlite3.Connection, recipe_id: int) -> dict:
    row = _require(conn, recipe_id)
    recipe = dict(row)
    recipe["favorite"] = bool(recipe["favorite"])
    recipe["own"] = bool(recipe["own"])
    recipe["total_time"] = total_time(row["prep_time"], row["cook_time"])
    category = conn.execute("SELECT name FROM categories WHERE id = ?", (row["category_id"],)).fetchone()
    recipe["category_name"] = category["name"] if category else None
    recipe["tags"] = [
        r["name"]
        for r in conn.execute(
            """SELECT t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
               WHERE rt.recipe_id = ? ORDER BY t.name COLLATE ro""",
            (recipe_id,),
        )
    ]
    recipe["ingredients"] = [
        dict(r)
        for r in conn.execute(
            """SELECT id, group_name, position, quantity, quantity_text, unit, name, note
               FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position""",
            (recipe_id,),
        )
    ]
    recipe["steps"] = [
        r["text"] for r in conn.execute("SELECT text FROM recipe_steps WHERE recipe_id = ? ORDER BY position", (recipe_id,))
    ]
    return recipe
