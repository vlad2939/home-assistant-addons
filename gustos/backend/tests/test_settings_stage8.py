"""Etapa 8: site-uri de import, export / restaurare, manual."""

import io
import json
import sqlite3
import zipfile

import pytest
from PIL import Image

from app.services import backup, photos


def jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (600, 400), (200, 80, 20)).save(buf, "JPEG")
    return buf.getvalue()


def add_recipe(client, title="Ciorbă de test", with_photo=False):
    rid = client.post("/api/recipes", json={"title": title, "category_id": 1, "tags": ["test"],
                                            "ingredients": [{"name": "apă", "quantity": 1, "unit": "l"}],
                                            "steps": ["Se fierbe."]}).json()["id"]
    if with_photo:
        client.post(f"/api/recipes/{rid}/photo", files={"file": ("p.jpg", jpeg(), "image/jpeg")})
    return rid


def export(client) -> bytes:
    r = client.get("/api/backup/export")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    assert "gustos-backup-" in r.headers["content-disposition"]
    return r.content


def restore(client, data: bytes):
    return client.post("/api/backup/restore", files={"file": ("backup.zip", data, "application/zip")})


# ---------- site-uri de import ----------

def test_add_site_normalizes(client):
    sites = client.post("/api/import-sites", json={"domain": "https://www.Exemplu.ro/retete/"}).json()
    assert "exemplu.ro" in [s["domain"] for s in sites]


@pytest.mark.parametrize("bad", ["nu e domeniu", "localhost", "exemplu", "http://"])
def test_add_site_invalid(client, bad):
    assert client.post("/api/import-sites", json={"domain": bad}).status_code == 422


def test_add_site_duplicate(client):
    assert client.post("/api/import-sites", json={"domain": "www.jamilacuisine.ro"}).status_code == 409


def test_toggle_and_delete_site(client):
    site = next(s for s in client.get("/api/import-sites").json() if s["domain"] == "teoskitchen.ro")
    sites = client.put(f"/api/import-sites/{site['id']}", json={"active": False}).json()
    assert next(s for s in sites if s["id"] == site["id"])["active"] == 0
    assert client.delete(f"/api/import-sites/{site['id']}").status_code == 204
    assert "teoskitchen.ro" not in [s["domain"] for s in client.get("/api/import-sites").json()]
    assert client.delete(f"/api/import-sites/{site['id']}").status_code == 404


def test_new_site_is_importable(client):
    client.post("/api/import-sites", json={"domain": "exemplu.ro"})
    r = client.post("/api/import/preview", json={"url": "https://exemplu.ro/x"})
    assert r.status_code != 403  # permis (descărcarea în sine poate eșua fără internet)


# ---------- export ----------

def test_export_contents(client):
    add_recipe(client, with_photo=True)
    add_recipe(client, "Fără poză")
    with zipfile.ZipFile(io.BytesIO(export(client))) as z:
        names = z.namelist()
        manifest = json.loads(z.read("manifest.json"))
        assert "gustos.db" in names
        assert sum(n.startswith("photos/") for n in names) == 2  # poza + miniatura
        assert manifest["app"] == "Gustos" and manifest["recipes"] == 2 and manifest["schema_version"] >= 1


def test_export_skips_orphan_photo_files(client):
    (photos.photos_dir() / ("a" * 32 + ".webp")).write_bytes(b"x")  # fișier rămas, fără rețetă
    with zipfile.ZipFile(io.BytesIO(export(client))) as z:
        assert not any(n.startswith("photos/") for n in z.namelist())


# ---------- restaurare ----------

def test_restore_roundtrip(client):
    rid = add_recipe(client, "Sarmale", with_photo=True)
    photo = client.get(f"/api/recipes/{rid}").json()["photo"]
    client.put("/api/settings", json={"theme": "dark"})
    data = export(client)

    # după export: schimbări care trebuie să dispară la restaurare
    client.delete(f"/api/recipes/{rid}")
    add_recipe(client, "Rețetă nouă")
    client.put("/api/settings", json={"theme": "light"})

    r = restore(client, data)
    assert r.status_code == 200, r.text
    result = r.json()
    assert result["recipes"] == 1 and result["photos"] == 1
    assert [i["title"] for i in client.get("/api/recipes").json()["items"]] == ["Sarmale"]
    assert client.get(f"/api/recipes/{rid}").json()["photo"] == photo
    assert client.get(f"/photos/{photo}").status_code == 200
    assert client.get("/api/settings").json()["theme"] == "dark"
    # căutarea funcționează după restaurare
    assert client.get("/api/recipes", params={"q": "sarmale"}).json()["total"] == 1


def test_restore_makes_safety_backup(client):
    add_recipe(client, "Starea curentă")
    data = export(client)
    result = restore(client, data).json()
    safety = client.get("/api/backup/safety").json()
    assert [s["name"] for s in safety] == [result["safety_backup"]]
    r = client.get(f"/api/backup/safety/{result['safety_backup']}")
    assert r.status_code == 200
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        assert json.loads(z.read("manifest.json"))["recipes"] == 1


def test_safety_backups_pruned(client, monkeypatch):
    data = export(client)
    stamps = iter(f"2026-10-19-1000{i:02d}" for i in range(10))
    monkeypatch.setattr(backup, "_timestamp", lambda: next(stamps))
    for _ in range(7):
        assert restore(client, data).status_code == 200
    names = [s["name"] for s in client.get("/api/backup/safety").json()]
    assert len(names) == 5
    assert names[0] == "inainte-de-restaurare-2026-10-19-100006.zip"


def test_safety_download_rejects_other_files(client):
    assert client.get("/api/backup/safety/..%5Cgustos.db").status_code == 404
    assert client.get("/api/backup/safety/gustos.db").status_code == 404


def make_zip(files: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, content in files.items():
            z.writestr(name, content)
    return buf.getvalue()


def valid_db_bytes(tmp_path, version=1) -> bytes:
    path = tmp_path / "x.db"
    conn = sqlite3.connect(path)
    conn.executescript(f"CREATE TABLE recipes (id INTEGER); CREATE TABLE categories (id INTEGER); PRAGMA user_version = {version};")
    conn.close()
    return path.read_bytes()


MANIFEST = json.dumps({"app": "Gustos"})


def test_restore_rejects_non_zip(client):
    r = restore(client, b"nu sunt zip")
    assert r.status_code == 422 and "ZIP" in r.json()["detail"]


def test_restore_rejects_other_zip(client):
    r = restore(client, make_zip({"poza.jpg": b"x"}))
    assert r.status_code == 422 and "nu este un backup Gustos" in r.json()["detail"]


def test_restore_rejects_path_traversal(client, tmp_path):
    r = restore(client, make_zip({"manifest.json": MANIFEST, "gustos.db": valid_db_bytes(tmp_path), "../../rau.txt": b"x"}))
    assert r.status_code == 422 and "neașteptat" in r.json()["detail"]


def test_restore_rejects_corrupt_db(client):
    r = restore(client, make_zip({"manifest.json": MANIFEST, "gustos.db": b"nu e sqlite" * 100}))
    assert r.status_code == 422 and "deteriorat" in r.json()["detail"]


def test_restore_rejects_newer_schema(client, tmp_path):
    r = restore(client, make_zip({"manifest.json": MANIFEST, "gustos.db": valid_db_bytes(tmp_path, version=99)}))
    assert r.status_code == 422 and "mai nouă" in r.json()["detail"]


def test_failed_restore_changes_nothing(client):
    add_recipe(client, "Rămâne")
    restore(client, b"stricat")
    assert client.get("/api/stats").json()["recipes"] == 1
    assert client.get("/api/backup/safety").json() == []


# ---------- manual ----------

def test_manual(client):
    r = client.get("/api/manual")
    assert r.status_code == 200
    assert r.text.startswith("# Manual de utilizare Gustos")
    assert "© concept și realizare vlad39" in r.text
