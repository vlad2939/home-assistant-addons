"""Lista de cumpărături. Fiecare modificare întoarce lista completă."""

import sqlite3

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import db
from ..services import shopping as service

router = APIRouter(prefix="/api/shopping", tags=["shopping"])


class ItemIn(BaseModel):
    name: str = Field(max_length=200)
    amount: str | None = Field(default=None, max_length=60)


class ItemsIn(BaseModel):
    items: list[ItemIn] = Field(min_length=1, max_length=300)


def _result(conn: sqlite3.Connection, added: int | None = None) -> dict:
    return {"items": service.list_items(conn), "added": added}


@router.get("")
def read(conn: sqlite3.Connection = Depends(db.get_conn)):
    return _result(conn)


@router.get("/candidates")
def candidates(
    recipe_id: int | None = None,
    servings: int | None = None,
    menu_id: int | None = None,
    conn: sqlite3.Connection = Depends(db.get_conn),
):
    """Ingredientele unei rețete (pentru porțiile alese) sau ale unui meniu, din care se aleg cumpărăturile."""
    return service.candidates(conn, recipe_id, servings, menu_id)


@router.post("/items")
def add(data: ItemsIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    return _result(conn, service.add_items(conn, [i.model_dump() for i in data.items]))


@router.put("/items/{item_id}")
def update(item_id: int, data: ItemIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.update_item(conn, item_id, data.name, data.amount)
    return _result(conn)


@router.delete("/items/{item_id}")
def delete(item_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.delete_item(conn, item_id)
    return _result(conn)


@router.post("/clear")
def clear(conn: sqlite3.Connection = Depends(db.get_conn)):
    service.clear(conn)
    return _result(conn)
