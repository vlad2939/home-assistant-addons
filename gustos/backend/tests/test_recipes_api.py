from app.services import photos

SARMALE = {
    "title": "  Sarmale în foi de varză ",
    "description": "Sarmale tradiţionale",
    "servings": 6,
    "prep_time": 60,
    "cook_time": 180,
    "difficulty": "medie",
    "category_id": 2,
    "tags": ["Tradițional", "iarnă", "tradițional", " "],
    "ingredients": [
        {"group_name": "Pentru umplutură", "quantity": 500, "unit": "g", "name": "carne tocată de porc"},
        {"group_name": "Pentru umplutură", "quantity": 1, "unit": "bucată", "name": "Ceapă", "note": "tocată"},
        {"quantity_text": "un praf", "name": "piper"},
    ],
    "steps": ["Se căleşte ceapa.", "", "Se rulează sarmalele."],
    "tips": "Mai bune a doua zi.",
    "source_url": "https://www.jamilacuisine.ro/sarmale/",
}


def create(client, **overrides):
    r = client.post("/api/recipes", json={**SARMALE, **overrides})
    assert r.status_code == 201, r.text
    return r.json()


def test_create_and_read(client):
    created = create(client)
    r = client.get(f"/api/recipes/{created['id']}")
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Sarmale în foi de varză"
    assert data["description"] == "Sarmale tradiționale"  # ţ cu sedilă corectat
    assert data["category_name"] == "Fel principal"
    assert data["tags"] == ["iarnă", "tradițional"]
    assert data["steps"] == ["Se călește ceapa.", "Se rulează sarmalele."]
    assert [i["name"] for i in data["ingredients"]] == ["carne tocată de porc", "Ceapă", "piper"]
    assert data["ingredients"][2]["quantity"] is None
    assert data["ingredients"][2]["quantity_text"] == "un praf"
    assert data["total_time"] == 240
    assert data["source_site"] == "jamilacuisine.ro"
    assert data["favorite"] is False


def test_manual_source_by_default(client):
    created = create(client, source_url=None)
    assert created["source_site"] == "manual"


def test_title_required(client):
    assert client.post("/api/recipes", json={**SARMALE, "title": "   "}).status_code == 422


def test_invalid_category(client):
    r = client.post("/api/recipes", json={**SARMALE, "category_id": 999})
    assert r.status_code == 422
    assert "Categoria" in r.json()["detail"]


def test_invalid_source_url(client):
    assert client.post("/api/recipes", json={**SARMALE, "source_url": "ftp://x"}).status_code == 422


def test_update_replaces_children(client):
    created = create(client)
    payload = {
        **SARMALE,
        "title": "Sarmale de post",
        "tags": ["post"],
        "ingredients": [{"quantity": 300, "unit": "g", "name": "orez"}],
        "steps": ["Unicul pas."],
    }
    r = client.put(f"/api/recipes/{created['id']}", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Sarmale de post"
    assert data["tags"] == ["post"]
    assert [i["name"] for i in data["ingredients"]] == ["orez"]
    assert data["steps"] == ["Unicul pas."]
    # Tag-urile nefolosite dispar
    assert [t["name"] for t in client.get("/api/tags").json()] == ["post"]


def test_update_missing_recipe(client):
    assert client.put("/api/recipes/999", json=SARMALE).status_code == 404


def test_delete_removes_photo_and_children(client, conn):
    created = create(client)
    folder = photos.photos_dir()
    (folder / "0123456789abcdef0123456789abcdef.webp").write_bytes(b"x")
    (folder / "0123456789abcdef0123456789abcdef_thumb.webp").write_bytes(b"x")
    conn.execute("UPDATE recipes SET photo = '0123456789abcdef0123456789abcdef.webp' WHERE id = ?", (created["id"],))
    conn.commit()

    assert client.delete(f"/api/recipes/{created['id']}").status_code == 204
    assert client.get(f"/api/recipes/{created['id']}").status_code == 404
    assert not (folder / "0123456789abcdef0123456789abcdef.webp").exists()
    assert not (folder / "0123456789abcdef0123456789abcdef_thumb.webp").exists()
    assert conn.execute("SELECT COUNT(*) FROM recipe_ingredients").fetchone()[0] == 0
    assert conn.execute("SELECT COUNT(*) FROM recipes_fts").fetchone()[0] == 0
    assert client.get("/api/tags").json() == []


def test_delete_missing_recipe(client):
    assert client.delete("/api/recipes/999").status_code == 404


def test_toggle_favorite(client):
    created = create(client)
    url = f"/api/recipes/{created['id']}/favorite"
    assert client.post(url).json() == {"favorite": True}
    assert client.get(f"/api/recipes/{created['id']}").json()["favorite"] is True
    assert client.post(url).json() == {"favorite": False}


def test_random(client):
    assert client.get("/api/recipes/random").status_code == 404
    created = create(client)
    assert client.get("/api/recipes/random").json()["id"] == created["id"]
    assert client.get("/api/recipes/random?category=1").status_code == 404


def test_stats_and_sources(client):
    create(client)
    create(client, title="Clătite", source_url=None, category_id=6)
    stats = client.get("/api/stats").json()
    assert stats["recipes"] == 2 and stats["categories"] == 11 and stats["favorites"] == 0
    sources = {s["source_site"]: s["recipe_count"] for s in client.get("/api/sources").json()}
    assert sources == {"jamilacuisine.ro": 1, "manual": 1}
