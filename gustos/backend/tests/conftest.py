import os
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    """Fiecare test are propriul folder de date, niciodată dev-data/ sau /data."""
    monkeypatch.setenv("GUSTOS_DATA_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:  # „with” rulează pornirea (migrările)
        yield c


@pytest.fixture
def conn():
    from app import db

    c = db.connect()
    db.migrate(c)
    yield c
    c.close()
