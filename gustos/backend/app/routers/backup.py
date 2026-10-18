import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from ..services import backup

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/export")
def export_all():
    """„Exportă tot”: descarcă un ZIP cu baza de date și pozele."""
    fd, tmp = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    backup.create_backup(Path(tmp))
    return FileResponse(
        tmp,
        media_type="application/zip",
        filename=backup.export_filename(),
        background=BackgroundTask(os.remove, tmp),
    )


@router.post("/restore")
async def restore(file: UploadFile):
    fd, tmp = tempfile.mkstemp(suffix=".zip")
    try:
        with os.fdopen(fd, "wb") as out:
            size = 0
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > backup.MAX_RESTORE_BYTES:
                    raise HTTPException(413, "Backup-ul este prea mare.")
                out.write(chunk)
        return backup.restore_backup(Path(tmp))
    finally:
        Path(tmp).unlink(missing_ok=True)


@router.get("/safety")
def safety_backups():
    """Copiile de siguranță făcute automat înainte de restaurări (cele mai noi primele)."""
    files = sorted(backup.backups_dir().glob("inainte-de-restaurare-*.zip"), reverse=True)
    return [{"name": f.name, "size": f.stat().st_size} for f in files]


@router.get("/safety/{name}")
def download_safety(name: str):
    file = backup.backups_dir() / name
    if not name.startswith("inainte-de-restaurare-") or not name.endswith(".zip") or "/" in name or "\\" in name or not file.is_file():
        raise HTTPException(404)
    return FileResponse(file, media_type="application/zip", filename=name)

