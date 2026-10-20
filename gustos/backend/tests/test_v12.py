"""Gustos 1.2: marcajul „Rețeta mea”."""

import sqlite3

from app import db

RECIPE = {"title": "Ciorbă de-a mea", "ingredients": [{"name": "fasole"}], "steps": ["Se fierbe."]}


def test_own_flag_saved_listed_and_counted(client):
    mine = client.post("/api/recipes", json={**RECIPE, "own": True}).json()
    other = client.post("/api/recipes", json={**RECIPE, "title": "Importată"}).json()
    assert mine["own"] is True and other["own"] is False

    items = client.get("/api/recipes", params={"own": "true"}).json()["items"]
    assert [(r["title"], r["own"]) for r in items] == [("Ciorbă de-a mea", True)]
    assert client.get("/api/stats").json()["own"] == 1

    # editarea fără marcaj îl scoate
    client.put(f"/api/recipes/{mine['id']}", json=RECIPE)
    assert client.get(f"/api/recipes/{mine['id']}").json()["own"] is False
    assert client.get("/api/stats").json()["own"] == 0


def test_migration_marks_old_recipes_as_not_own(tmp_path):
    path = tmp_path / "vechi.db"
    c = sqlite3.connect(path)
    for number, file in db.migrations()[:2]:
        c.executescript(file.read_text(encoding="utf-8"))
    c.executescript("INSERT INTO recipes (title) VALUES ('Veche'); PRAGMA user_version = 2;")
    c.close()
    c = db.connect(path)
    assert db.migrate(c) == len(db.migrations())
    assert tuple(c.execute("SELECT title, own FROM recipes").fetchone()) == ("Veche", 0)
    c.close()
