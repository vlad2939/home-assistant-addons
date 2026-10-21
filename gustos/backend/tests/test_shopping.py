"""Lista de cumpărături simplificată (2.1): produse cu cantitate liberă, alese din rețete / meniuri."""

import sqlite3

import pytest

from app import db


def recipe(client, title, servings, ingredients):
    r = client.post("/api/recipes", json={"title": title, "servings": servings, "ingredients": ingredients})
    assert r.status_code == 201
    return r.json()["id"]


@pytest.fixture
def two(client):
    a = recipe(client, "Sarmale", 4, [
        {"quantity": 500, "unit": "g", "name": "carne tocată"},
        {"quantity": 1, "unit": "kg", "name": "varză murată"},
        {"quantity_text": "puțină", "name": "sare"},
    ])
    b = recipe(client, "Chiftele", 2, [
        {"quantity": 250, "unit": "g", "name": "Carne tocata"},
        {"quantity": 2, "name": "ouă"},
    ])
    return a, b


def add(client, *items):
    r = client.post("/api/shopping/items", json={"items": list(items)})
    assert r.status_code == 200, r.text
    return r.json()


def test_add_edit_delete_clear(client):
    body = add(client, {"name": " cartofi ", "amount": "2 kg"}, {"name": "detergent de vase"})
    assert body["added"] == 2
    assert [(i["name"], i["amount"]) for i in body["items"]] == [("cartofi", "2 kg"), ("detergent de vase", None)]
    first = body["items"][0]["id"]
    items = client.put(f"/api/shopping/items/{first}", json={"name": "cartofi noi", "amount": "3 kg"}).json()["items"]
    assert (items[0]["name"], items[0]["amount"]) == ("cartofi noi", "3 kg")
    assert client.put(f"/api/shopping/items/{first}", json={"name": "  "}).status_code == 422
    assert client.put("/api/shopping/items/999", json={"name": "x"}).status_code == 404
    assert len(client.delete(f"/api/shopping/items/{first}").json()["items"]) == 1
    assert client.post("/api/shopping/clear").json()["items"] == []


def test_same_product_is_not_added_twice(client):
    add(client, {"name": "Făină"})
    body = add(client, {"name": "faina"}, {"name": "ulei"}, {"name": "Ulei"})
    assert body["added"] == 1 and [i["name"] for i in body["items"]] == ["Făină", "ulei"]


def test_candidates_from_recipe_are_scaled_and_marked(client, two):
    a, _ = two
    add(client, {"name": "sare"})
    rows = client.get("/api/shopping/candidates", params={"recipe_id": a, "servings": 8}).json()
    assert [(r["name"], r["quantity"], r["unit"], r["in_list"]) for r in rows] == [
        ("carne tocată", 1000, "g", False), ("varză murată", 2, "kg", False), ("sare", None, None, True)]
    assert rows[2]["quantity_text"] == "puțină" and rows[0]["recipe"] == "Sarmale"


def test_candidates_from_menu_use_each_item_portions(client, two):
    a, b = two
    menu = client.post("/api/menus", json={"kind": "event", "title": "Masă", "start_date": "2026-12-25", "guests": 8, "items": [
        {"recipe_id": a, "slot": "principal", "servings": 8},
        {"recipe_id": b, "slot": "aperitive", "servings": 4},
    ]}).json()
    rows = client.get("/api/shopping/candidates", params={"menu_id": menu["id"]}).json()
    assert [(r["name"], r["quantity"], r["recipe"]) for r in rows] == [
        ("carne tocată", 1000, "Sarmale"), ("varză murată", 2, "Sarmale"), ("sare", None, "Sarmale"),
        ("Carne tocata", 500, "Chiftele"), ("ouă", 4, "Chiftele")]


def test_candidates_errors(client):
    assert client.get("/api/shopping/candidates", params={"recipe_id": 999}).status_code == 404
    assert client.get("/api/shopping/candidates", params={"menu_id": 999}).status_code == 404
    assert client.get("/api/shopping/candidates").status_code == 422
    assert client.post("/api/shopping/items", json={"items": []}).status_code == 422


def test_migration_keeps_unchecked_items_once(tmp_path):
    path = tmp_path / "vechi.db"
    c = sqlite3.connect(path)
    for _, file in db.migrations()[:6]:
        c.executescript(file.read_text(encoding="utf-8"))
    c.executescript("""
        INSERT INTO shopping_items (name, name_normalized, quantity, unit, aisle, checked, position) VALUES
          ('făină', 'faina', 500, 'g', 'Băcănie', 0, 1),
          ('Faina', 'faina', 200, 'g', 'Băcănie', 0, 2),
          ('lapte', 'lapte', 1, 'l', 'Lactate și ouă', 1, 3),
          ('ouă', 'oua', 6, NULL, 'Lactate și ouă', 0, 4);
        PRAGMA user_version = 6;""")
    c.close()
    c = db.connect(path)
    db.migrate(c)
    assert [tuple(r) for r in c.execute("SELECT name, amount FROM shopping_list ORDER BY position")] == [("făină", None), ("ouă", None)]
    c.close()


def test_recipe_list_marks_videos(client):
    recipe(client, "Cu clip", 2, [])
    client.post("/api/recipes", json={"title": "Clip", "video_url": "https://youtu.be/HoZFE_V-11E"})
    items = {i["title"]: i["has_video"] for i in client.get("/api/recipes").json()["items"]}
    assert items == {"Cu clip": False, "Clip": True}
