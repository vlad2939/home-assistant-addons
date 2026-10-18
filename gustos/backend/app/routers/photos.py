import sqlite3

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import db
from ..services import photos
from ..services import recipes as recipes_service

router = APIRouter(tags=["photos"])


@router.post("/api/recipes/{recipe_id}/photo")
async def upload_photo(recipe_id: int, file: UploadFile, conn: sqlite3.Connection = Depends(db.get_conn)):
    old = recipes_service.get_recipe(conn, recipe_id)["photo"]
    data = await file.read(photos.MAX_UPLOAD_BYTES + 1)
    name = photos.save_photo(data)
    with conn:
        conn.execute(
            "UPDATE recipes SET photo = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now') WHERE id = ?",
            (name, recipe_id),
        )
    photos.delete_photo(old)
    return {"photo": name}


@router.delete("/api/recipes/{recipe_id}/photo", status_code=204)
def remove_photo(recipe_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    old = recipes_service.get_recipe(conn, recipe_id)["photo"]
    with conn:
        conn.execute(
            "UPDATE recipes SET photo = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%S', 'now') WHERE id = ?",
            (recipe_id,),
        )
    photos.delete_photo(old)


@router.get("/photos/{name}", include_in_schema=False)
def serve_photo(name: str):
    if not photos.is_valid_name(name):
        raise HTTPException(404)
    file = photos.photos_dir() / name
    if not file.is_file():
        raise HTTPException(404)
    # numele sunt unice (o poză nouă are alt nume), deci pot fi păstrate în cache
    return FileResponse(file, media_type="image/webp", headers={"Cache-Control": "public, max-age=31536000, immutable"})
