"""Configurare: folderul de date și informațiile din config.yaml (sursa unică a versiunii)."""

import os
from functools import lru_cache
from pathlib import Path

import yaml

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parents[1]
STATIC_DIR = APP_DIR / "static"
CONFIG_FILE = PROJECT_ROOT / "config.yaml"


def data_dir() -> Path:
    """Folderul cu baza de date și pozele. Implicit ./dev-data (dezvoltare)."""
    path = Path(os.environ.get("GUSTOS_DATA_DIR", PROJECT_ROOT / "dev-data"))
    path.mkdir(parents=True, exist_ok=True)
    return path


@lru_cache
def addon_info() -> dict:
    with CONFIG_FILE.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def version() -> str:
    return str(addon_info()["version"])
