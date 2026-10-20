"""Meniuri: săptămânale (luni–duminică × mic dejun / prânz / cină) și evenimente (pe feluri de mâncare)."""

import sqlite3
from datetime import date, timedelta

from fastapi import HTTPException
from pydantic import BaseModel, Field, model_validator

from ..schemas import Text
from .recipes import total_time

MEALS = ["mic_dejun", "pranz", "cina"]
COURSES = ["aperitive", "supe", "principal", "garnituri", "desert", "bauturi"]
_NOW = "strftime('%Y-%m-%dT%H:%M:%S', 'now')"


class MenuItemIn(BaseModel):
    recipe_id: int
    day: int | None = Field(default=None, ge=0, le=6)
    slot: str
    servings: int = Field(ge=1, le=200)


class MenuIn(BaseModel):
    kind: str = Field(pattern="^(week|event)$")
    title: Text = Field(default=None, max_length=100)
    start_date: date
    guests: int = Field(default=2, ge=1, le=200)
    notes: Text = Field(default=None, max_length=5000)
    items: list[MenuItemIn] = Field(default_factory=list, max_length=300)

    @model_validator(mode="after")
    def _check(self):
        if self.kind == "week":
            # orice zi aleasă devine lunea săptămânii respective
            self.start_date -= timedelta(days=self.start_date.weekday())
            for item in self.items:
                if item.day is None or item.slot not in MEALS:
                    raise ValueError("La meniul săptămânal, fiecare rețetă are o zi și o masă (mic dejun, prânz, cină).")
        else:
            if not self.title:
                raise ValueError("Evenimentul are nevoie de un nume (de exemplu „Crăciun”).")
            for item in self.items:
                if item.slot not in COURSES:
                    raise ValueError("Felul de mâncare ales nu există.")
                item.day = None
        return self


def _summary_sql(where: str = "") -> str:
    return f"""SELECT m.id, m.kind, m.title, m.start_date, m.guests, m.updated_at,
                      COUNT(i.id) AS item_count
               FROM menus m LEFT JOIN menu_items i ON i.menu_id = m.id
               {where}
               GROUP BY m.id
               ORDER BY m.start_date DESC, m.id DESC"""


def list_menus(conn: sqlite3.Connection, week: date | None = None) -> list[dict]:
    if week is not None:
        monday = week - timedelta(days=week.weekday())
        sql = _summary_sql("WHERE m.kind = 'week' AND m.start_date = ?")
        return [dict(r) for r in conn.execute(sql, (monday.isoformat(),))]
    return [dict(r) for r in conn.execute(_summary_sql())]


def _require(conn: sqlite3.Connection, menu_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM menus WHERE id = ?", (menu_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Meniul nu există.")
    return row


def get_menu(conn: sqlite3.Connection, menu_id: int) -> dict:
    menu = dict(_require(conn, menu_id))
    rows = conn.execute(
        """SELECT i.id, i.recipe_id, i.day, i.slot, i.servings, i.position,
                  r.title, r.photo, r.servings AS recipe_servings, r.prep_time, r.cook_time, r.own,
                  c.name AS category_name
           FROM menu_items i JOIN recipes r ON r.id = i.recipe_id
           LEFT JOIN categories c ON c.id = r.category_id
           WHERE i.menu_id = ? ORDER BY i.position, i.id""",
        (menu_id,),
    ).fetchall()
    menu["items"] = []
    for r in rows:
        item = dict(r)
        item["total_time"] = total_time(item.pop("prep_time"), item.pop("cook_time"))
        item["own"] = bool(item["own"])
        menu["items"].append(item)
    return menu


def _check_week_free(conn: sqlite3.Connection, data: MenuIn, exclude_id: int | None = None) -> None:
    if data.kind != "week":
        return
    row = conn.execute(
        "SELECT id FROM menus WHERE kind = 'week' AND start_date = ? AND id IS NOT ?",
        (data.start_date.isoformat(), exclude_id),
    ).fetchone()
    if row:
        raise HTTPException(409, "Există deja un meniu pentru această săptămână.")


def _write_items(conn: sqlite3.Connection, menu_id: int, data: MenuIn) -> None:
    ids = {i.recipe_id for i in data.items}
    if ids:
        marks = ",".join("?" for _ in ids)
        found = {r[0] for r in conn.execute(f"SELECT id FROM recipes WHERE id IN ({marks})", list(ids))}
        if ids - found:
            raise HTTPException(422, "Una dintre rețetele alese nu mai există.")
    conn.execute("DELETE FROM menu_items WHERE menu_id = ?", (menu_id,))
    conn.executemany(
        "INSERT INTO menu_items (menu_id, recipe_id, day, slot, servings, position) VALUES (?, ?, ?, ?, ?, ?)",
        [(menu_id, i.recipe_id, i.day, i.slot, i.servings, pos) for pos, i in enumerate(data.items, start=1)],
    )


def create_menu(conn: sqlite3.Connection, data: MenuIn) -> int:
    _check_week_free(conn, data)
    with conn:
        menu_id = conn.execute(
            "INSERT INTO menus (kind, title, start_date, guests, notes) VALUES (?, ?, ?, ?, ?)",
            (data.kind, data.title, data.start_date.isoformat(), data.guests, data.notes),
        ).lastrowid
        _write_items(conn, menu_id, data)
    return menu_id


def update_menu(conn: sqlite3.Connection, menu_id: int, data: MenuIn) -> None:
    current = _require(conn, menu_id)
    if current["kind"] != data.kind:
        raise HTTPException(422, "Tipul meniului (săptămână / eveniment) nu se poate schimba.")
    _check_week_free(conn, data, exclude_id=menu_id)
    with conn:
        conn.execute(
            f"UPDATE menus SET title = ?, start_date = ?, guests = ?, notes = ?, updated_at = {_NOW} WHERE id = ?",
            (data.title, data.start_date.isoformat(), data.guests, data.notes, menu_id),
        )
        _write_items(conn, menu_id, data)


def delete_menu(conn: sqlite3.Connection, menu_id: int) -> None:
    _require(conn, menu_id)
    with conn:
        conn.execute("DELETE FROM menus WHERE id = ?", (menu_id,))


def copy_menu(conn: sqlite3.Connection, menu_id: int, start: date) -> int:
    """Copiază meniul (de exemplu săptămâna trecută) la altă dată, cu toate rețetele."""
    menu = get_menu(conn, menu_id)
    data = MenuIn(
        kind=menu["kind"],
        title=menu["title"],
        start_date=start,
        guests=menu["guests"],
        notes=menu["notes"],
        items=[
            MenuItemIn(recipe_id=i["recipe_id"], day=i["day"], slot=i["slot"], servings=i["servings"])
            for i in menu["items"]
        ],
    )
    return create_menu(conn, data)
