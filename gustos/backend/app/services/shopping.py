"""Lista de cumpărături: o listă simplă de produse, cu o cantitate scrisă liber („2 kg”, „1 pachet”).

Lista se pregătește acasă (aplicația merge doar în rețeaua locală) și se ia la magazin tipărită sau copiată
ca text pe telefon. Din rețete și meniuri se aleg doar produsele de cumpărat; în listă intră denumirea,
fără gramajele din rețetă. Același produs nu apare de două ori.
"""

import sqlite3

from fastapi import HTTPException

from ..text import fix_romanian, normalize


def list_items(conn: sqlite3.Connection) -> list[dict]:
    return [
        dict(r)
        for r in conn.execute("SELECT id, name, amount FROM shopping_list ORDER BY position, id")
    ]


def _clean(text: str | None) -> str | None:
    text = " ".join((fix_romanian(text) or "").split())
    return text or None


def add_items(conn: sqlite3.Connection, items: list[dict]) -> int:
    """Adaugă produsele care nu sunt deja în listă (după denumirea fără diacritice). Returnează câte s-au adăugat."""
    existing = {r[0] for r in conn.execute("SELECT name_normalized FROM shopping_list")}
    added = 0
    with conn:
        for item in items:
            name = _clean(item.get("name"))
            if not name or normalize(name) in existing:
                continue
            existing.add(normalize(name))
            conn.execute(
                """INSERT INTO shopping_list (name, name_normalized, amount, position)
                   SELECT ?, ?, ?, coalesce(MAX(position), 0) + 1 FROM shopping_list""",
                (name[:200], normalize(name), (_clean(item.get("amount")) or "")[:60] or None),
            )
            added += 1
    return added


def update_item(conn: sqlite3.Connection, item_id: int, name: str, amount: str | None) -> None:
    name = _clean(name)
    if not name:
        raise HTTPException(422, "Scrie denumirea produsului.")
    with conn:
        changed = conn.execute(
            "UPDATE shopping_list SET name = ?, name_normalized = ?, amount = ? WHERE id = ?",
            (name[:200], normalize(name), (_clean(amount) or "")[:60] or None, item_id),
        ).rowcount
    if not changed:
        raise HTTPException(404, "Produsul nu mai este în listă.")


def delete_item(conn: sqlite3.Connection, item_id: int) -> None:
    with conn:
        conn.execute("DELETE FROM shopping_list WHERE id = ?", (item_id,))


def clear(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute("DELETE FROM shopping_list")


def _ingredients(conn: sqlite3.Connection, recipe_id: int, servings: int | None) -> list[dict]:
    recipe = conn.execute("SELECT title, servings FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    if recipe is None:
        raise HTTPException(404, "Rețeta nu există.")
    factor = servings / recipe["servings"] if servings and recipe["servings"] else 1
    rows = conn.execute(
        "SELECT name, quantity, quantity_text, unit FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position",
        (recipe_id,),
    ).fetchall()
    return [
        {
            "name": r["name"],
            "quantity": r["quantity"] * factor if r["quantity"] is not None else None,
            "quantity_text": r["quantity_text"],
            "unit": r["unit"],
            "recipe": recipe["title"],
        }
        for r in rows
    ]


def candidates(conn: sqlite3.Connection, recipe_id: int | None, servings: int | None, menu_id: int | None) -> list[dict]:
    """Ingredientele din care se alege ce se cumpără, cu cantitatea din rețetă (doar ca ajutor)."""
    if menu_id is not None:
        if not conn.execute("SELECT 1 FROM menus WHERE id = ?", (menu_id,)).fetchone():
            raise HTTPException(404, "Meniul nu există.")
        rows = []
        for item in conn.execute("SELECT recipe_id, servings FROM menu_items WHERE menu_id = ? ORDER BY position", (menu_id,)):
            rows.extend(_ingredients(conn, item["recipe_id"], item["servings"]))
    elif recipe_id is not None:
        rows = _ingredients(conn, recipe_id, servings)
    else:
        raise HTTPException(422, "Alege o rețetă sau un meniu.")
    in_list = {r[0] for r in conn.execute("SELECT name_normalized FROM shopping_list")}
    for row in rows:
        row["in_list"] = normalize(row["name"]) in in_list
    return rows
