"""Generează variantele optimizate ale logo-ului din tools/logo-source.png (logo-ul original furnizat).

Rulare (din folderul proiectului): python tools/make_logos.py
"""

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"


def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    src = Image.open(ROOT / "tools" / "logo-source.png").convert("RGBA")
    for name, size, quality in [("logo.webp", 1024, 88), ("logo-small.webp", 160, 90)]:
        src.resize((size, size), Image.LANCZOS).save(PUBLIC / name, "WEBP", quality=quality, method=6)
    # Home Assistant: icon.png (128 px) și logo.png (pagina add-on-ului)
    src.resize((128, 128), Image.LANCZOS).save(ROOT / "icon.png", optimize=True)
    src.resize((512, 512), Image.LANCZOS).save(ROOT / "logo.png", optimize=True)
    shutil.copyfile(ROOT / "icon.ico", PUBLIC / "favicon.ico")
    for f in sorted(PUBLIC.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
