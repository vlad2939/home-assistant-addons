"""Lista de cumpărături: ingrediente din rețete și meniuri, adunate, pe raioane.

Adunarea: același ingredient (după denumirea fără diacritice) cu unități compatibile se adună într-un singur
rând: „500 g făină” + „0,5 kg făină” = „1 kg făină”; „2 linguri ulei” + „1 lingură ulei” = „3 linguri ulei”.
Cantitățile fără număr („un praf”, „la gust”) nu se dublează. Unitățile diferite rămân pe rânduri separate.
"""

import re
import sqlite3

from fastapi import HTTPException

from ..text import fix_romanian, normalize
from .ingredient_parser import parse_ingredient

# raionul: prima regulă care se potrivește; ordinea contează („pastă de roșii” e la băcănie, nu la legume)
AISLES = [
    ("Băcănie", r"pasta de rosii|bulion|conserv|\bsos\b|ketchup|lapte de cocos|praf de copt|bicarbonat|drojdie"),
    ("Condimente", r"\bsare\b|piper|boia|chimion|scortisoar|nucsoar|cuisoar|\bdafin|oregano|curry|vanilie|esenta|"
                   r"condiment|delikat|vegeta|ienibahar|anason|turmeric|chili|paprika|cimbru uscat|busuioc uscat"),
    ("Carne și pește", r"carne|\bpui\b|porc|\bvita|vitel|miel|curcan|\brata\b|piept|pulpe|cotlet|ceafa|muschi|carnat|"
                       r"bacon|sunca|salam|parizer|peste|somon|\bton\b|creveti|fructe de mare|\bcod\b|pastrav|crap|"
                       r"macrou|hering|ficat|afumatura|slanina|kaizer|costita|chicken|beef|pork"),
    ("Lactate și ouă", r"lapte|branz|telemea|cascaval|smantan|iaurt|\bunt\b|frisca|mozzarella|parmezan|cheddar|"
                       r"mascarpone|ricotta|\bfeta\b|\bou\b|\boua\b|galbenus|albus|chefir|\bsana\b"),
    ("Panificație", r"\bpaine|chifl|lipii|baghet|pesmet|foi de|aluat|\bblat|tortilla|cozonac|covrig"),
    ("Legume și fructe", r"cartof|ceap|usturoi|morcov|ardei|rosii|\brosie|castravet|varz|telina|patrunjel|marar|leustean|"
                         r"salata|spanac|dovlec|vinete|vanat|ciuperc|fasole verde|mazare|porumb|lamai|portocal|\bmere\b|"
                         r"\bmar\b|\bpere\b|banan|capsun|strugur|praz|sfecl|ridich|avocado|\blime\b|ghimbir|busuioc|"
                         r"cimbru|rozmarin|coriandru|caise|prune|cirese|visine|zmeur|afine|pepene|fructe|legume|verdeata"),
    ("Băcănie", r"faina|zahar|orez|paste|spaghete|ulei|otet|mustar|maionez|miere|ciocolat|cacao|nuci|migdale|alune|"
                r"stafide|fulgi|malai|gris|amidon|gelatin|\bvin\b|bere|\bapa\b|\bsuc\b|cafea|\bceai\b|supa|\bcub|"
                r"fasole|linte|naut|biscuit|gem|dulceata|sirop|masline|\bbors\b|tarate"),
]
AISLE_ORDER = ["Legume și fructe", "Carne și pește", "Lactate și ouă", "Panificație", "Băcănie", "Condimente", "Altele"]

_BASE = {"g": ("g", 1), "kg": ("g", 1000), "ml": ("ml", 1), "l": ("ml", 1000)}


def aisle_for(name: str) -> str:
    text = normalize(name)
    for aisle, pattern in AISLES:
        if re.search(pattern, text):
            return aisle
    return "Altele"


def list_items(conn: sqlite3.Connection) -> list[dict]:
    order = "CASE aisle " + " ".join(f"WHEN '{a}' THEN {i}" for i, a in enumerate(AISLE_ORDER)) + " ELSE 99 END"
    rows = conn.execute(f"SELECT * FROM shopping_items ORDER BY checked, {order}, position, id").fetchall()
    return [{**dict(r), "checked": bool(r["checked"])} for r in rows]


def _add_one(conn: sqlite3.Connection, ing: dict, factor: float, source: str | None) -> None:
    name = fix_romanian(ing.get("name") or "")
    if not name:
        return
    key = normalize(name)
    quantity = ing.get("quantity")
    unit = ing.get("unit")
    if quantity is not None:
        quantity *= factor
        if unit in _BASE:  # totul în grame / mililitri, ca să se poată aduna
            unit, mult = _BASE[unit]
            quantity *= mult
    text = None if quantity is not None else ing.get("quantity_text")

    same = conn.execute(
        "SELECT * FROM shopping_items WHERE name_normalized = ? AND checked = 0 ORDER BY id", (key,)
    ).fetchall()
    for row in same:
        numeric = quantity is not None and row["quantity"] is not None and row["unit"] == unit
        textual = quantity is None and row["quantity"] is None and (row["unit"] == unit or not text)
        if numeric or textual:
            sources = [s for s in (row["sources"] or "").split(", ") if s]
            if source and source not in sources:
                sources.append(source)
            conn.execute(
                "UPDATE shopping_items SET quantity = ?, sources = ? WHERE id = ?",
                (row["quantity"] + quantity if numeric else row["quantity"], ", ".join(sources)[:300] or None, row["id"]),
            )
            return
    conn.execute(
        """INSERT INTO shopping_items (name, name_normalized, quantity, quantity_text, unit, note, aisle, sources, position)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, coalesce(MAX(position), 0) + 1 FROM shopping_items""",
        (name, key, quantity, text, unit, ing.get("note"), aisle_for(name), source),
    )


def _recipe_ingredients(conn: sqlite3.Connection, recipe_id: int) -> tuple[sqlite3.Row, list[dict]]:
    recipe = conn.execute("SELECT id, title, servings FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    if recipe is None:
        raise HTTPException(404, "Rețeta nu există.")
    rows = conn.execute(
        "SELECT quantity, quantity_text, unit, name, note FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position",
        (recipe_id,),
    ).fetchall()
    return recipe, [dict(r) for r in rows]


def add_text(conn: sqlite3.Connection, text: str) -> None:
    """Un produs scris de mână: „2 kg cartofi”, „detergent”."""
    with conn:
        _add_one(conn, parse_ingredient(text), 1, None)


def add_recipe(conn: sqlite3.Connection, recipe_id: int, servings: int | None) -> int:
    recipe, ingredients = _recipe_ingredients(conn, recipe_id)
    factor = servings / recipe["servings"] if servings and recipe["servings"] else 1
    with conn:
        for ing in ingredients:
            _add_one(conn, ing, factor, recipe["title"])
    return len(ingredients)


def add_menu(conn: sqlite3.Connection, menu_id: int) -> int:
    items = conn.execute("SELECT recipe_id, servings FROM menu_items WHERE menu_id = ? ORDER BY position", (menu_id,)).fetchall()
    if not conn.execute("SELECT 1 FROM menus WHERE id = ?", (menu_id,)).fetchone():
        raise HTTPException(404, "Meniul nu există.")
    count = 0
    with conn:
        for item in items:
            recipe, ingredients = _recipe_ingredients(conn, item["recipe_id"])
            factor = item["servings"] / recipe["servings"] if recipe["servings"] else 1
            for ing in ingredients:
                _add_one(conn, ing, factor, recipe["title"])
            count += len(ingredients)
    return count


def set_checked(conn: sqlite3.Connection, item_id: int, checked: bool) -> None:
    with conn:
        if not conn.execute("UPDATE shopping_items SET checked = ? WHERE id = ?", (int(checked), item_id)).rowcount:
            raise HTTPException(404, "Produsul nu mai este în listă.")


def delete_item(conn: sqlite3.Connection, item_id: int) -> None:
    with conn:
        conn.execute("DELETE FROM shopping_items WHERE id = ?", (item_id,))


def clear(conn: sqlite3.Connection, only_checked: bool) -> None:
    with conn:
        conn.execute("DELETE FROM shopping_items" + (" WHERE checked = 1" if only_checked else ""))
