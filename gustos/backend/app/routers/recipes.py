import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from .. import db
from ..schemas import RecipeIn
from ..services import recipes as service
from ..services.search import Filters, list_recipes

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("")
def search(
    q: str | None = None,
    category: int | None = None,
    ingredient: list[str] = Query(default=[]),
    tags: list[str] = Query(default=[]),
    source: str | None = None,
    favorite: bool | None = None,
    sort: str | None = None,
    conn: sqlite3.Connection = Depends(db.get_conn),
):
    items = list_recipes(conn, Filters(q, category, ingredient, tags, source, favorite, sort))
    return {"total": len(items), "items": items}


@router.get("/random")
def random_recipe(category: int | None = None, conn: sqlite3.Connection = Depends(db.get_conn)):
    """„Ce gătesc azi?” – o rețetă la întâmplare (opțional dintr-o categorie)."""
    sql = "SELECT id FROM recipes"
    params = []
    if category is not None:
        sql += " WHERE category_id = ?"
        params.append(category)
    row = conn.execute(sql + " ORDER BY random() LIMIT 1", params).fetchone()
    if row is None:
        raise HTTPException(404, "Nu există încă rețete.")
    return service.get_recipe(conn, row["id"])


@router.post("", status_code=201)
def create(data: RecipeIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    recipe_id = service.create_recipe(conn, data)
    return service.get_recipe(conn, recipe_id)


@router.get("/{recipe_id}")
def read(recipe_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    return service.get_recipe(conn, recipe_id)


@router.put("/{recipe_id}")
def update(recipe_id: int, data: RecipeIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.update_recipe(conn, recipe_id, data)
    return service.get_recipe(conn, recipe_id)


@router.delete("/{recipe_id}", status_code=204)
def delete(recipe_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.delete_recipe(conn, recipe_id)
    return Response(status_code=204)


@router.post("/{recipe_id}/favorite")
def favorite(recipe_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    return {"favorite": service.toggle_favorite(conn, recipe_id)}
