"""Pozele rețetelor din <data>/photos.

Convenție: poza mare „<id>.webp”, miniatura „<id>_thumb.webp”; în baza de date se păstrează „<id>.webp”.
La încărcare: orientarea corectată după EXIF, datele EXIF (inclusiv locația) eliminate, conversie în WebP.
"""

import io
import re
import uuid
from pathlib import Path

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from .. import config

try:  # HEIC (poze de pe iPhone / unele tablete), dacă biblioteca e disponibilă
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:  # pragma: no cover
    pass

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
LARGE_SIZE = 1600
THUMB_SIZE = 480
Image.MAX_IMAGE_PIXELS = 80_000_000  # protecție împotriva fișierelor-capcană uriașe

_NAME = re.compile(r"^[0-9a-f]{32}(_thumb)?\.webp$")


def photos_dir() -> Path:
    path = config.data_dir() / "photos"
    path.mkdir(parents=True, exist_ok=True)
    return path


def thumb_name(photo: str) -> str:
    return photo.removesuffix(".webp") + "_thumb.webp"


def is_valid_name(name: str) -> bool:
    return bool(_NAME.match(name))


def _resized(image: Image.Image, size: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((size, size), Image.LANCZOS)
    return copy


def save_photo(data: bytes) -> str:
    """Procesează imaginea primită și returnează numele fișierului salvat."""
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Poza este prea mare (maximum 15 MB).")
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Fișierul nu este o imagine acceptată (JPG, PNG, WebP sau HEIC).") from None

    image = ImageOps.exif_transpose(image)  # rotește după orientarea camerei
    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    image = image.convert("RGBA" if has_alpha else "RGB")

    name = f"{uuid.uuid4().hex}.webp"
    folder = photos_dir()
    # fără argumentul exif, WebP-ul rezultat nu conține date EXIF
    _resized(image, LARGE_SIZE).save(folder / name, "WEBP", quality=82, method=5)
    _resized(image, THUMB_SIZE).save(folder / thumb_name(name), "WEBP", quality=78, method=5)
    return name


def delete_photo(photo: str | None) -> None:
    if not photo or not is_valid_name(photo):
        return
    folder = photos_dir()
    for name in (photo, thumb_name(photo)):
        (folder / name).unlink(missing_ok=True)
