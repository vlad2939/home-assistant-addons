"""Lista site-urilor de pe care se poate importa (Setări → Import)."""

import re
import sqlite3
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from .. import db

router = APIRouter(prefix="/api/import-sites", tags=["import"])

_DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


class SiteIn(BaseModel):
    domain: str = Field(min_length=3, max_length=300)


class SiteChange(BaseModel):
    active: bool


def clean_domain(text: str) -> str:
    """„https://www.Exemplu.ro/retete/” → „exemplu.ro”."""
    text = text.strip().lower()
    if "://" not in text:
        text = "http://" + text
    host = (urlsplit(text).hostname or "").removeprefix("www.").rstrip(".")
    if not _DOMAIN.match(host):
        raise HTTPException(422, "Scrie un domeniu valid, de exemplu „exemplu.ro”.")
    return host


def _all(conn: sqlite3.Connection) -> list[dict]:
    return [dict(r) for r in conn.execute("SELECT id, domain, active FROM import_sites ORDER BY domain")]


def _require(conn: sqlite3.Connection, site_id: int) -> None:
    if not conn.execute("SELECT 1 FROM import_sites WHERE id = ?", (site_id,)).fetchone():
        raise HTTPException(404, "Site-ul nu există în listă.")


@router.get("")
def list_sites(conn: sqlite3.Connection = Depends(db.get_conn)):
    return _all(conn)


@router.post("", status_code=201)
def add_site(data: SiteIn, conn: sqlite3.Connection = Depends(db.get_conn)):
    domain = clean_domain(data.domain)
    if conn.execute("SELECT 1 FROM import_sites WHERE domain = ?", (domain,)).fetchone():
        raise HTTPException(409, f"Site-ul {domain} este deja în listă.")
    with conn:
        conn.execute("INSERT INTO import_sites (domain, active) VALUES (?, 1)", (domain,))
    return _all(conn)


@router.put("/{site_id}")
def change_site(site_id: int, data: SiteChange, conn: sqlite3.Connection = Depends(db.get_conn)):
    _require(conn, site_id)
    with conn:
        conn.execute("UPDATE import_sites SET active = ? WHERE id = ?", (int(data.active), site_id))
    return _all(conn)


@router.delete("/{site_id}", status_code=204)
def delete_site(site_id: int, conn: sqlite3.Connection = Depends(db.get_conn)):
    _require(conn, site_id)
    with conn:
        conn.execute("DELETE FROM import_sites WHERE id = ?", (site_id,))
    return Response(status_code=204)
