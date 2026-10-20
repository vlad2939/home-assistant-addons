"""Galeria foto a unei rețete: poze în plus față de poza principală."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from pydantic import BaseModel

from .. import db
from ..services import photos
from ..services import recipes as recipes_service

router = APIRouter(prefix="/api/recipes/{recipe_id}/gallery", tags=["gallery"])

MAX_GALLERY = 30
_TOUCH = "UPDATE recipes SET updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now') WHERE id = ?"


class GalleryOrder(BaseModel):
    ids: list[int]


def _require_photo(conn: sqlite3.Connection, recipe_id: int, photo_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM recipe_photos WHERE id = ? AND recipe_id = ?", (photo_id, recipe_id)).fetchone()
    if row is None:
        raise HTTPException(404, "Poza nu există în galeria acestei rețete.")
    return row


@router.get("")
def list_gallery(recipe_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    recipes_service.get_recipe(conn, recipe_id)
    return recipes_service.gallery(conn, recipe_id)


@router.post("")
async def add_photos(recipe_id: int, files: list[UploadFile], conn: sqlite3.Connection = Depends(db.get_conn)):
    """Adaugă una sau mai multe poze. O poză greșită nu le oprește pe celelalte; erorile se întorc în listă."""
    recipes_service.get_recipe(conn, recipe_id)
    count = conn.execute("SELECT COUNT(*) FROM recipe_photos WHERE recipe_id = ?", (recipe_id,)).fetchone()[0]
    errors = []
    for file in files:
        if count >= MAX_GALLERY:
            errors.append(f"Galeria are deja {MAX_GALLERY} de poze, maximul permis.")
            break
        try:
            name = photos.save_photo(await file.read(photos.MAX_UPLOAD_BYTES + 1))
        except HTTPException as e:
            errors.append(f"{file.filename}: {e.detail}")
            continue
        with conn:
            conn.execute(
                "INSERT INTO recipe_photos (recipe_id, photo, position) "
                "SELECT ?, ?, coalesce(MAX(position), 0) + 1 FROM recipe_photos WHERE recipe_id = ?",
                (recipe_id, name, recipe_id),
            )
            conn.execute(_TOUCH, (recipe_id,))
        count += 1
    return {"gallery": recipes_service.gallery(conn, recipe_id), "errors": errors}


@router.delete("/{photo_id}", status_code=204)
def delete_photo(recipe_id: int, photo_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    row = _require_photo(conn, recipe_id, photo_id)
    with conn:
        conn.execute("DELETE FROM recipe_photos WHERE id = ?", (photo_id,))
        conn.execute(_TOUCH, (recipe_id,))
    photos.delete_photo(row["photo"])
    return Response(status_code=204)


@router.post("/{photo_id}/cover")
def make_cover(recipe_id: int, photo_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Poza aleasă devine poza principală; fosta poză principală trece în galerie, în locul ei."""
    row = _require_photo(conn, recipe_id, photo_id)
    cover = recipes_service.get_recipe(conn, recipe_id)["photo"]
    with conn:
        conn.execute("UPDATE recipes SET photo = ? WHERE id = ?", (row["photo"], recipe_id))
        if cover:
            conn.execute("UPDATE recipe_photos SET photo = ? WHERE id = ?", (cover, photo_id))
        else:
            conn.execute("DELETE FROM recipe_photos WHERE id = ?", (photo_id,))
        conn.execute(_TOUCH, (recipe_id,))
    return {"photo": row["photo"], "gallery": recipes_service.gallery(conn, recipe_id)}


@router.put("/order")
def reorder(recipe_id: int, data: GalleryOrder, conn: sqlite3.Connection = Depends(db.get_conn)):
    existing = {r[0] for r in conn.execute("SELECT id FROM recipe_photos WHERE recipe_id = ?", (recipe_id,))}
    if sorted(data.ids) != sorted(existing):
        raise HTTPException(422, "Lista pentru reordonare trebuie să conțină toate pozele din galerie, o singură dată.")
    with conn:
        conn.executemany("UPDATE recipe_photos SET position = ? WHERE id = ?", [(p, i) for p, i in enumerate(data.ids, 1)])
    return recipes_service.gallery(conn, recipe_id)
