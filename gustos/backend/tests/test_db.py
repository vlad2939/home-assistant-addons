import sqlite3

import pytest

from app import db
from app.text import fix_romanian, normalize

EXPECTED_CATEGORIES = [
    "Supe și ciorbe", "Fel principal", "Garnituri", "Salate", "Aperitive", "Deserturi",
    "Panificație și patiserie", "Sosuri", "Conserve și murături", "Mic dejun", "Băuturi",
]


def test_migrate_sets_version(conn):
    assert db.schema_version(conn) == len(db.migrations())


def test_migrate_is_idempotent(conn):
    before = conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    db.migrate(conn)
    assert conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0] == before


def test_wal_mode(conn):
    assert conn.execute("PRAGMA journal_mode").fetchone()[0] == "wal"


def test_tables_exist(conn):
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for t in ["categories", "recipes", "tags", "recipe_tags", "recipe_ingredients",
              "recipe_steps", "recipes_fts", "import_sites", "settings"]:
        assert t in names


def test_base_categories_in_order(conn):
    rows = conn.execute("SELECT name FROM categories ORDER BY position").fetchall()
    assert [r[0] for r in rows] == EXPECTED_CATEGORIES


def test_import_sites_and_settings(conn):
    assert conn.execute("SELECT COUNT(*) FROM import_sites WHERE active = 1").fetchone()[0] == 7
    settings = dict(conn.execute("SELECT key, value FROM settings").fetchall())
    assert settings == {"theme": "auto", "accent": "orange"}


def test_category_with_recipes_cannot_be_deleted(conn):
    conn.execute("INSERT INTO recipes (title, category_id) VALUES ('Ciorbă', 1)")
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("DELETE FROM categories WHERE id = 1")


def test_deleting_recipe_cascades(conn):
    rid = conn.execute("INSERT INTO recipes (title) VALUES ('Test')").lastrowid
    conn.execute(
        "INSERT INTO recipe_ingredients (recipe_id, position, name, name_normalized) VALUES (?, 1, 'sare', 'sare')",
        (rid,),
    )
    conn.execute("INSERT INTO recipe_steps (recipe_id, position, text) VALUES (?, 1, 'Fierbe')", (rid,))
    conn.execute("DELETE FROM recipes WHERE id = ?", (rid,))
    assert conn.execute("SELECT COUNT(*) FROM recipe_ingredients").fetchone()[0] == 0
    assert conn.execute("SELECT COUNT(*) FROM recipe_steps").fetchone()[0] == 0


@pytest.mark.parametrize("stored", ["Supă cu tăiței", "Supă cu tăiţei", "SUPĂ CU TĂIȚEI"])
@pytest.mark.parametrize("query", ["taitei", "tăiței", "tăiţei", "TAITEI", "tait*"])
def test_fts_ignores_diacritics_and_case(conn, stored, query):
    conn.execute("INSERT INTO recipes_fts (rowid, title) VALUES (1, ?)", (stored,))
    assert conn.execute("SELECT rowid FROM recipes_fts WHERE recipes_fts MATCH ?", (query,)).fetchall()


def test_fix_romanian():
    assert fix_romanian("  Ciorbă de perişoare cu ţelină ") == "Ciorbă de perișoare cu țelină"
    assert fix_romanian(None) is None


def test_normalize():
    assert normalize("Făină   Albă ţ") == "faina alba t"
    assert normalize("Ș ș Ț ț Ă Â Î") == "s s t t a a i"
    assert normalize(None) == ""


def test_migrations_must_be_consecutive(tmp_path, monkeypatch):
    (tmp_path / "001_a.sql").write_text("")
    (tmp_path / "003_b.sql").write_text("")
    monkeypatch.setattr(db, "MIGRATIONS_DIR", tmp_path)
    with pytest.raises(RuntimeError):
        db.migrations()


def test_failed_migration_rolls_back(tmp_path, monkeypatch):
    (tmp_path / "001_ok.sql").write_text("CREATE TABLE a (x);")
    (tmp_path / "002_bad.sql").write_text("CREATE TABLE b (x); INSERT INTO nu_exista VALUES (1);")
    monkeypatch.setattr(db, "MIGRATIONS_DIR", tmp_path)
    c = db.connect(tmp_path / "t.db")
    with pytest.raises(sqlite3.OperationalError):
        db.migrate(c)
    assert db.schema_version(c) == 1
    names = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "a" in names and "b" not in names
    c.close()


def test_categories_endpoint(client):
    r = client.get("/api/categories")
    assert r.status_code == 200
    data = r.json()
    assert [c["name"] for c in data] == EXPECTED_CATEGORIES
    assert all(c["recipe_count"] == 0 for c in data)
