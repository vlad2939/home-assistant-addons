"""Lista de cumpărături. Fiecare modificare întoarce lista completă (ca toate dispozitivele să fie la zi)."""

import sqlite3

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import db
from ..schemas import RequiredText
from ..services import shopping as service

router = APIRouter(prefix="/api/shopping", tags=["shopping"])


class TextIn(BaseModel):
    text: RequiredText = Field(min_length=1, max_length=200)


class RecipeIn(BaseModel):
    recipe_id: int
    servings: int | None = Field(default=None, ge=1, le=200)


class MenuIn(BaseModel):
    menu_id: int


class CheckIn(BaseModel):
    checked: bool


class ClearIn(BaseModel):
    only_checked: bool = True


def _result(conn: sqlite3.Connection, added: int | None = None) -> dict:
    return {"items": service.list_items(conn), "added": added}


@router.get("")
def read(conn: sqlite3.Connection = Depends(db.get_conn)):
    return _result(conn)


@router.post("/items")
def add_item(data: TextIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.add_text(conn, data.text)
    return _result(conn, 1)


@router.post("/from-recipe")
def from_recipe(data: RecipeIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    return _result(conn, service.add_recipe(conn, data.recipe_id, data.servings))


@router.post("/from-menu")
def from_menu(data: MenuIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    return _result(conn, service.add_menu(conn, data.menu_id))


@router.patch("/items/{item_id}")
def check(item_id: int, data: CheckIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.set_checked(conn, item_id, data.checked)
    return _result(conn)


@router.delete("/items/{item_id}")
def delete(item_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.delete_item(conn, item_id)
    return _result(conn)


@router.post("/clear")
def clear(data: ClearIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.clear(conn, data.only_checked)
    return _result(conn)
