"""Traducerea ciornei de import din engleză în română (din previzualizare) și modelul local."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from .. import db
from ..services import translate as service

router = APIRouter(prefix="/api/translate", tags=["translate"])


class TranslateIn(BaseModel):
    recipe: dict


def _setting(conn: sqlite3.Connection, key: str) -> str | None:
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def _engine(conn: sqlite3.Connection) -> str:
    return _setting(conn, "translator") or "local"


@router.get("/status")
def status(conn: sqlite3.Connection = Depends(db.get_conn)):
    return {
        "translator": _engine(conn),
        "local": service.download_status(),
        "deepl": {"configured": bool(_setting(conn, "deepl_key"))},
    }


@router.post("/model")
def download_model():
    return service.start_download()


@router.delete("/model", status_code=204)
def delete_model():
    service.delete_model()
    return Response(status_code=204)


@router.post("/deepl-usage")
def deepl_usage(conn: sqlite3.Connection = Depends(db.get_conn)):
    key = _setting(conn, "deepl_key")
    if not key:
        raise HTTPException(400, "Nu ai trecut cheia DeepL.")
    try:
        return service.deepl_usage(key)
    except service.TranslationError as e:
        raise HTTPException(e.status, str(e)) from None


@router.post("")
def translate(data: TranslateIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    engine = _engine(conn)
    key = _setting(conn, "deepl_key")
    try:
        return {**service.translate_recipe(data.recipe, engine, key), "warning": None}
    except service.TranslationError as e:
        # DeepL indisponibil / limită depășită → traducerea locală, dacă modelul e descărcat
        if engine == "deepl" and e.status in (429, 502) and service.model_installed():
            result = service.translate_recipe(data.recipe, "local")
            return {**result, "warning": f"{e} Am folosit traducerea locală."}
        raise HTTPException(e.status, str(e)) from None
