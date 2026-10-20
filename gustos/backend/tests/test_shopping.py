"""Gustos 2 – etapa 13: lista de cumpărături."""

import pytest

from app.services.shopping import aisle_for


def recipe(client, title, servings, ingredients):
    r = client.post("/api/recipes", json={"title": title, "servings": servings, "ingredients": ingredients})
    assert r.status_code == 201
    return r.json()["id"]


@pytest.fixture
def two(client):
    a = recipe(client, "Sarmale", 4, [
        {"quantity": 500, "unit": "g", "name": "carne tocată"},
        {"quantity": 1, "unit": "kg", "name": "varză murată"},
        {"quantity_text": "un praf", "name": "piper"},
        {"quantity": 2, "unit": "lingură", "name": "ulei"},
    ])
    b = recipe(client, "Chiftele", 2, [
        {"quantity": 0.25, "unit": "kg", "name": "Carne tocata"},
        {"quantity_text": "un praf", "name": "piper"},
        {"quantity": 1, "unit": "lingură", "name": "ulei"},
        {"quantity": 2, "name": "ouă"},
    ])
    return a, b


def by_name(items):
    return {i["name_normalized"]: i for i in items}


def test_add_recipe_scales_to_servings(client, two):
    a, _ = two
    r = client.post("/api/shopping/from-recipe", json={"recipe_id": a, "servings": 8}).json()
    items = by_name(r["items"])
    assert r["added"] == 4
    assert (items["carne tocata"]["quantity"], items["carne tocata"]["unit"]) == (1000, "g")
    assert (items["varza murata"]["quantity"], items["varza murata"]["unit"]) == (2000, "g")
    assert items["piper"]["quantity_text"] == "un praf"
    assert items["carne tocata"]["sources"] == "Sarmale"


def test_same_ingredients_are_added_together(client, two):
    a, b = two
    client.post("/api/shopping/from-recipe", json={"recipe_id": a})
    items = client.post("/api/shopping/from-recipe", json={"recipe_id": b}).json()["items"]
    found = by_name(items)
    assert len(items) == 5  # carne, varză, piper, ulei, ouă
    assert found["carne tocata"]["quantity"] == 750 and found["carne tocata"]["sources"] == "Sarmale, Chiftele"
    assert found["ulei"]["quantity"] == 3 and found["ulei"]["unit"] == "lingură"
    assert found["piper"]["quantity_text"] == "un praf"  # nu se dublează


def test_add_menu_uses_portions_of_each_item(client, two):
    a, b = two
    menu = client.post("/api/menus", json={"kind": "event", "title": "Masă", "start_date": "2026-12-25", "guests": 8, "items": [
        {"recipe_id": a, "slot": "principal", "servings": 8},
        {"recipe_id": b, "slot": "aperitive", "servings": 4},
    ]}).json()
    r = client.post("/api/shopping/from-menu", json={"menu_id": menu["id"]}).json()
    found = by_name(r["items"])
    assert r["added"] == 8
    assert found["carne tocata"]["quantity"] == 1500  # 2 × 500 g + 2 × 250 g
    assert found["oua"]["quantity"] == 4


def test_checked_items_are_not_merged_and_go_last(client, two):
    a, _ = two
    items = client.post("/api/shopping/from-recipe", json={"recipe_id": a}).json()["items"]
    meat = by_name(items)["carne tocata"]
    items = client.patch(f"/api/shopping/items/{meat['id']}", json={"checked": True}).json()["items"]
    assert items[-1]["id"] == meat["id"] and items[-1]["checked"] is True
    items = client.post("/api/shopping/from-recipe", json={"recipe_id": a}).json()["items"]
    assert [i["quantity"] for i in items if i["name_normalized"] == "carne tocata"] == [500, 500]


def test_manual_items_delete_and_clear(client):
    items = client.post("/api/shopping/items", json={"text": "2 kg cartofi"}).json()["items"]
    assert (items[0]["name"], items[0]["quantity"], items[0]["unit"], items[0]["aisle"]) == ("cartofi", 2000, "g", "Legume și fructe")
    items = client.post("/api/shopping/items", json={"text": "detergent de vase"}).json()["items"]
    assert by_name(items)["detergent de vase"]["aisle"] == "Altele"
    first = items[0]["id"]
    client.patch(f"/api/shopping/items/{first}", json={"checked": True})
    assert len(client.post("/api/shopping/clear", json={"only_checked": True}).json()["items"]) == 1
    left = client.get("/api/shopping").json()["items"][0]["id"]
    assert client.delete(f"/api/shopping/items/{left}").json()["items"] == []
    assert client.post("/api/shopping/items", json={"text": "  "}).status_code == 422
    assert client.patch("/api/shopping/items/999", json={"checked": True}).status_code == 404


def test_items_are_sorted_by_aisle(client):
    for text in ("sare", "lapte", "ceapă", "pâine"):
        client.post("/api/shopping/items", json={"text": text})
    assert [i["aisle"] for i in client.get("/api/shopping").json()["items"]] == [
        "Legume și fructe", "Lactate și ouă", "Panificație", "Condimente"]


@pytest.mark.parametrize("name, aisle", [
    ("pastă de roșii", "Băcănie"), ("roșii", "Legume și fructe"), ("piept de pui", "Carne și pește"),
    ("unt", "Lactate și ouă"), ("praf de copt", "Băcănie"), ("piper negru", "Condimente"), ("făină", "Băcănie"),
    ("suc de lămâie", "Legume și fructe"), ("borș", "Băcănie"), ("hârtie de copt", "Altele"),
])
def test_aisles(name, aisle):
    assert aisle_for(name) == aisle


def test_missing_recipe_or_menu(client):
    assert client.post("/api/shopping/from-recipe", json={"recipe_id": 999}).status_code == 404
    assert client.post("/api/shopping/from-menu", json={"menu_id": 999}).status_code == 404
