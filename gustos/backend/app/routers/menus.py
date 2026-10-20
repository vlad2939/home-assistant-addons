import sqlite3
from datetime import date

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from .. import db
from ..services import menus as service
from ..services.menus import MenuIn

router = APIRouter(prefix="/api/menus", tags=["menus"])


class CopyIn(BaseModel):
    start_date: date


@router.get("")
def list_menus(week: date | None = None, conn: sqlite3.Connection = Depends(db.get_conn)):
    """Toate meniurile, cele mai noi primele; cu ?week=AAAA-LL-ZZ doar meniul săptămânii care conține acea zi."""
    return service.list_menus(conn, week)


@router.post("", status_code=201)
def create(data: MenuIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    return service.get_menu(conn, service.create_menu(conn, data))


@router.get("/{menu_id}")
def read(menu_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    return service.get_menu(conn, menu_id)


@router.put("/{menu_id}")
def update(menu_id: int, data: MenuIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.update_menu(conn, menu_id, data)
    return service.get_menu(conn, menu_id)


@router.delete("/{menu_id}", status_code=204)
def delete(menu_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    service.delete_menu(conn, menu_id)
    return Response(status_code=204)


@router.post("/{menu_id}/copy", status_code=201)
def copy(menu_id: int, data: CopyIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    return service.get_menu(conn, service.copy_menu(conn, menu_id, data.start_date))
