"""Export și restaurare: un ZIP cu baza de date și pozele.

Conținutul ZIP-ului:
    manifest.json        aplicația, versiunea, versiunea schemei, data, numărul de rețete
    gustos.db            copie consistentă a bazei de date (API-ul de backup SQLite)
    photos/<nume>.webp   pozele

Restaurarea verifică ZIP-ul înainte de orice modificare și salvează automat starea curentă în
<data>/backups/ (se păstrează ultimele 5).
"""

import json
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException

from .. import config, db
from . import photos

MANIFEST = "manifest.json"
DB_NAME = "gustos.db"
KEEP_SAFETY_BACKUPS = 5
MAX_RESTORE_BYTES = 1024 * 1024 * 1024  # 1 GB


def backups_dir() -> Path:
    path = config.data_dir() / "backups"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d-%H%M%S")


def _snapshot(target: Path) -> int:
    """Copie consistentă a bazei de date, chiar dacă e folosită în acel moment. Returnează numărul de rețete."""
    source = db.connect()
    copy = sqlite3.connect(target)
    try:
        source.backup(copy)
        copy.execute("PRAGMA journal_mode = DELETE")  # fișier unic, fără -wal
        return copy.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
    finally:
        copy.close()
        source.close()


def create_backup(target: Path) -> dict:
    """Scrie ZIP-ul complet în target și returnează manifestul."""
    with tempfile.TemporaryDirectory() as tmp:
        db_copy = Path(tmp) / DB_NAME
        recipe_count = _snapshot(db_copy)
        conn = sqlite3.connect(db_copy)
        schema = conn.execute("PRAGMA user_version").fetchone()[0]
        used = {r[0] for r in conn.execute("SELECT photo FROM recipes WHERE photo IS NOT NULL")}
        conn.close()
        manifest = {
            "app": "Gustos",
            "version": config.version(),
            "schema_version": schema,
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "recipes": recipe_count,
        }
        folder = photos.photos_dir()
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(MANIFEST, json.dumps(manifest, ensure_ascii=False, indent=2))
            z.write(db_copy, DB_NAME)
            for name in sorted(used):
                for file in (name, photos.thumb_name(name)):
                    if photos.is_valid_name(file) and (folder / file).is_file():
                        # WebP e deja comprimat: se stochează fără recomprimare
                        z.write(folder / file, f"photos/{file}", compress_type=zipfile.ZIP_STORED)
    return manifest


def export_filename() -> str:
    return f"gustos-backup-{_timestamp()}.zip"


def _validate(zip_path: Path, workdir: Path) -> tuple[Path, list[str], dict]:
    try:
        archive = zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile:
        raise HTTPException(422, "Fișierul nu este un ZIP valid.") from None
    with archive:
        names = archive.namelist()
        if MANIFEST not in names or DB_NAME not in names:
            raise HTTPException(422, "ZIP-ul nu este un backup Gustos (lipsesc manifest.json sau gustos.db).")
        photo_names = []
        for name in names:
            if name in (MANIFEST, DB_NAME) or name == "photos/":
                continue
            file = name.removeprefix("photos/")
            if not name.startswith("photos/") or not photos.is_valid_name(file):
                raise HTTPException(422, f"ZIP-ul conține un fișier neașteptat: {name}")
            photo_names.append(file)
        if sum(info.file_size for info in archive.infolist()) > MAX_RESTORE_BYTES:
            raise HTTPException(422, "Backup-ul este prea mare.")
        try:
            manifest = json.loads(archive.read(MANIFEST))
        except ValueError:
            raise HTTPException(422, "Fișierul manifest.json din backup este deteriorat.") from None
        if manifest.get("app") != "Gustos":
            raise HTTPException(422, "ZIP-ul nu este un backup Gustos.")
        db_file = workdir / DB_NAME
        db_file.write_bytes(archive.read(DB_NAME))
        for name in photo_names:
            (workdir / "photos").mkdir(exist_ok=True)
            (workdir / "photos" / name).write_bytes(archive.read(f"photos/{name}"))

    conn = sqlite3.connect(db_file)
    try:
        ok = conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        schema = conn.execute("PRAGMA user_version").fetchone()[0]
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    except sqlite3.DatabaseError:
        raise HTTPException(422, "Baza de date din backup este deteriorată.") from None
    finally:
        conn.close()  # pe Windows, un fișier deschis nu poate fi șters
    if not ok or not {"recipes", "categories"} <= tables:
        raise HTTPException(422, "Baza de date din backup este deteriorată.")
    if schema > len(db.migrations()):
        raise HTTPException(422, "Backup-ul a fost făcut cu o versiune mai nouă a aplicației. Actualizează Gustos întâi.")
    return db_file, photo_names, manifest


def _prune_safety_backups() -> None:
    old = sorted(backups_dir().glob("inainte-de-restaurare-*.zip"))
    for file in old[:-KEEP_SAFETY_BACKUPS]:
        file.unlink(missing_ok=True)


def restore_backup(zip_path: Path) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        db_file, photo_names, manifest = _validate(zip_path, workdir)

        # 1. copie de siguranță a stării curente
        safety = backups_dir() / f"inainte-de-restaurare-{_timestamp()}.zip"
        create_backup(safety)
        _prune_safety_backups()

        # 2. baza de date: copiată peste cea curentă prin API-ul SQLite, apoi migrată la versiunea aplicației
        source = sqlite3.connect(db_file)
        target = db.connect()
        try:
            source.backup(target)
            db.migrate(target)
            recipes = target.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
        finally:
            source.close()
            target.close()

        # 3. pozele: folderul nou îl înlocuiește pe cel vechi
        folder = photos.photos_dir()
        staged = folder.with_name("photos-restaurare")
        old = folder.with_name("photos-vechi")
        shutil.rmtree(staged, ignore_errors=True)
        shutil.rmtree(old, ignore_errors=True)
        if (workdir / "photos").is_dir():
            shutil.copytree(workdir / "photos", staged)
        else:
            staged.mkdir()
        folder.rename(old)
        staged.rename(folder)
        shutil.rmtree(old, ignore_errors=True)

    return {
        "recipes": recipes,
        "photos": len([n for n in photo_names if not n.endswith("_thumb.webp")]),
        "backup_date": manifest.get("created_at"),
        "safety_backup": safety.name,
    }
