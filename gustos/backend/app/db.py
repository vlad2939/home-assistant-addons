"""Conexiunea SQLite și migrările versionate (fișiere SQL numerotate + PRAGMA user_version)."""

import re
import sqlite3
from collections.abc import Iterator
from pathlib import Path

from . import config
from .text import normalize

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
_MIGRATION_NAME = re.compile(r"^(\d{3})_[\w-]+\.sql$")


def db_path() -> Path:
    return config.data_dir() / "gustos.db"


def _collate_ro(a: str, b: str) -> int:
    """Ordonare alfabetică „românească”: Ă/Â/Î/Ș/Ț lângă literele de bază, fără diferențe de majuscule."""
    ka, kb = normalize(a), normalize(b)
    return (ka > kb) - (ka < kb) or (a > b) - (a < b)


def connect(path: Path | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.create_collation("ro", _collate_ro)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def migrations() -> list[tuple[int, Path]]:
    found = []
    for file in MIGRATIONS_DIR.glob("*.sql"):
        m = _MIGRATION_NAME.match(file.name)
        if m:
            found.append((int(m.group(1)), file))
    found.sort()
    numbers = [n for n, _ in found]
    if numbers != list(range(1, len(numbers) + 1)):
        raise RuntimeError(f"Migrările trebuie numerotate consecutiv de la 001: {numbers}")
    return found


def schema_version(conn: sqlite3.Connection) -> int:
    return conn.execute("PRAGMA user_version").fetchone()[0]


def migrate(conn: sqlite3.Connection) -> int:
    """Aplică migrările lipsă, fiecare într-o tranzacție. Returnează versiunea finală."""
    conn.execute("PRAGMA journal_mode = WAL")
    current = schema_version(conn)
    available = migrations()
    if current > len(available):
        raise RuntimeError(
            f"Baza de date are versiunea {current}, mai nouă decât aplicația ({len(available)})."
        )
    for number, file in available:
        if number <= current:
            continue
        sql = file.read_text(encoding="utf-8")
        try:
            conn.executescript(f"BEGIN;\n{sql}\nPRAGMA user_version = {number};\nCOMMIT;")
        except Exception:
            conn.rollback()
            raise
    return schema_version(conn)


def init() -> None:
    conn = connect()
    try:
        migrate(conn)
    finally:
        conn.close()


def get_conn() -> Iterator[sqlite3.Connection]:
    """Dependință FastAPI: o conexiune pe cerere."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
