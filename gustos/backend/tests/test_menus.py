"""Gustos 2 – etapa 12: meniuri săptămânale și evenimente."""

import pytest


def recipe(client, title, servings=4):
    r = client.post("/api/recipes", json={"title": title, "servings": servings})
    assert r.status_code == 201
    return r.json()["id"]


@pytest.fixture
def ids(client):
    return {name: recipe(client, name) for name in ("Ciorbă", "Sarmale", "Omletă", "Tort")}


def week(ids, **extra):
    return {
        "kind": "week",
        "start_date": "2026-10-22",  # joi → se salvează lunea, 2026-10-19
        "guests": 3,
        "items": [
            {"recipe_id": ids["Omletă"], "day": 0, "slot": "mic_dejun", "servings": 2},
            {"recipe_id": ids["Ciorbă"], "day": 0, "slot": "pranz", "servings": 3},
            {"recipe_id": ids["Sarmale"], "day": 0, "slot": "pranz", "servings": 3},
            {"recipe_id": ids["Sarmale"], "day": 6, "slot": "cina", "servings": 6},
        ],
        **extra,
    }


def test_create_week_menu_starts_on_monday(client, ids):
    r = client.post("/api/menus", json=week(ids))
    assert r.status_code == 201, r.text
    menu = r.json()
    assert menu["start_date"] == "2026-10-19" and menu["guests"] == 3
    assert [(i["title"], i["day"], i["slot"], i["servings"]) for i in menu["items"]] == [
        ("Omletă", 0, "mic_dejun", 2), ("Ciorbă", 0, "pranz", 3), ("Sarmale", 0, "pranz", 3), ("Sarmale", 6, "cina", 6)]
    assert menu["items"][0]["recipe_servings"] == 4


def test_one_menu_per_week_and_week_lookup(client, ids):
    first = client.post("/api/menus", json=week(ids)).json()
    r = client.post("/api/menus", json=week(ids, start_date="2026-10-25"))  # duminică, aceeași săptămână
    assert r.status_code == 409
    found = client.get("/api/menus", params={"week": "2026-10-21"}).json()
    assert [m["id"] for m in found] == [first["id"]] and found[0]["item_count"] == 4
    assert client.get("/api/menus", params={"week": "2026-10-27"}).json() == []


def test_event_menu_with_courses(client, ids):
    r = client.post("/api/menus", json={
        "kind": "event", "title": "Crăciun", "start_date": "2026-12-25", "guests": 10,
        "items": [{"recipe_id": ids["Sarmale"], "slot": "principal", "servings": 10, "day": 3},
                  {"recipe_id": ids["Tort"], "slot": "desert", "servings": 10}],
    })
    assert r.status_code == 201, r.text
    menu = r.json()
    assert menu["title"] == "Crăciun" and [i["day"] for i in menu["items"]] == [None, None]


@pytest.mark.parametrize("payload, words", [
    ({"kind": "event", "start_date": "2026-12-25"}, "nume"),
    ({"kind": "week", "start_date": "2026-10-19", "items": [{"recipe_id": 1, "slot": "pranz", "servings": 2}]}, "zi și o masă"),
    ({"kind": "event", "title": "X", "start_date": "2026-12-25", "items": [{"recipe_id": 1, "slot": "cina", "servings": 2}]}, "Felul"),
    ({"kind": "lunar", "start_date": "2026-10-19"}, ""),
    ({"kind": "week", "start_date": "2026-13-40"}, ""),
])
def test_invalid_menus(client, ids, payload, words):
    r = client.post("/api/menus", json=payload)
    assert r.status_code == 422 and words in r.text


def test_missing_recipe_is_rejected(client, ids):
    r = client.post("/api/menus", json={"kind": "week", "start_date": "2026-10-19",
                                         "items": [{"recipe_id": 999, "day": 1, "slot": "cina", "servings": 2}]})
    assert r.status_code == 422 and "nu mai există" in r.text


def test_update_replaces_items_and_cannot_change_kind(client, ids):
    menu = client.post("/api/menus", json=week(ids)).json()
    r = client.put(f"/api/menus/{menu['id']}", json=week(ids, guests=4, items=[
        {"recipe_id": ids["Tort"], "day": 5, "slot": "cina", "servings": 4}]))
    assert r.status_code == 200
    assert r.json()["guests"] == 4 and [i["title"] for i in r.json()["items"]] == ["Tort"]
    r = client.put(f"/api/menus/{menu['id']}", json={"kind": "event", "title": "X", "start_date": "2026-10-19"})
    assert r.status_code == 422


def test_deleting_recipe_removes_it_from_menus(client, ids):
    menu = client.post("/api/menus", json=week(ids)).json()
    client.delete(f"/api/recipes/{ids['Sarmale']}")
    assert [i["title"] for i in client.get(f"/api/menus/{menu['id']}").json()["items"]] == ["Omletă", "Ciorbă"]


def test_copy_week_and_delete(client, ids):
    menu = client.post("/api/menus", json=week(ids)).json()
    copy = client.post(f"/api/menus/{menu['id']}/copy", json={"start_date": "2026-10-28"})
    assert copy.status_code == 201
    assert copy.json()["start_date"] == "2026-10-26" and len(copy.json()["items"]) == 4
    assert client.post(f"/api/menus/{menu['id']}/copy", json={"start_date": "2026-10-20"}).status_code == 409
    assert [m["start_date"] for m in client.get("/api/menus").json()] == ["2026-10-26", "2026-10-19"]
    assert client.delete(f"/api/menus/{menu['id']}").status_code == 204
    assert client.get(f"/api/menus/{menu['id']}").status_code == 404
