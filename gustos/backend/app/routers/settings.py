"""Setări salvate pe server, ca să fie aceleași pe toate dispozitivele."""

import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .. import db

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsIn(BaseModel):
    theme: Literal["auto", "light", "dark"] | None = None
    accent: Literal["orange", "red", "green", "blue", "purple"] | None = None


def _read(conn: sqlite3.Connection) -> dict:
    return dict(conn.execute("SELECT key, value FROM settings").fetchall())


@router.get("")
def get_settings(conn: sqlite3.Connection = Depends(db.get_conn)):
    return _read(conn)


@router.put("")
def update_settings(data: SettingsIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    with conn:
        conn.executemany(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [(k, v) for k, v in data.model_dump(exclude_none=True).items()],
        )
    return _read(conn)
