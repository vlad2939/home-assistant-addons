"""Setări salvate pe server, ca să fie aceleași pe toate dispozitivele."""

import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .. import db

router = APIRouter(prefix="/api/settings", tags=["settings"])


SECRET_KEYS = {"deepl_key"}


class SettingsIn(BaseModel):
    theme: Literal["auto", "light", "dark"] | None = None
    accent: Literal["orange", "red", "green", "blue", "purple"] | None = None
    translator: Literal["local", "deepl"] | None = None
    deepl_key: str | None = Field(default=None, max_length=100)  # „” = ștergere


def _read(conn: sqlite3.Connection) -> dict:
    """Setările, fără cheia DeepL (se trimite doar dacă există și ultimele 4 caractere)."""
    values = dict(conn.execute("SELECT key, value FROM settings").fetchall())
    key = values.pop("deepl_key", None)
    values["deepl_key_set"] = bool(key)
    values["deepl_key_hint"] = key[-4:] if key else None
    return values


@router.get("")
def get_settings(conn: sqlite3.Connection = Depends(db.get_conn)):
    return _read(conn)


@router.put("")
def update_settings(data: SettingsIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    values = data.model_dump(exclude_none=True)
    with conn:
        for key in SECRET_KEYS:
            if key in values and not values[key].strip():
                conn.execute("DELETE FROM settings WHERE key = ?", (key,))
                del values[key]
        conn.executemany(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [(k, v.strip()) for k, v in values.items()],
        )
    return _read(conn)
