def names(client):
    return [c["name"] for c in client.get("/api/categories").json()]


def test_create_appends_at_end(client):
    r = client.post("/api/categories", json={"name": " Gustări de post "})
    assert r.status_code == 201
    assert r.json()["name"] == "Gustări de post"
    assert names(client)[-1] == "Gustări de post"


def test_duplicate_names_rejected(client):
    assert client.post("/api/categories", json={"name": "mic dejun"}).status_code == 409
    assert client.post("/api/categories", json={"name": "Bauturi"}).status_code == 409
    assert client.post("/api/categories", json={"name": ""}).status_code == 422


def test_rename(client):
    r = client.put("/api/categories/11", json={"name": "Băuturi și cocktailuri"})
    assert r.status_code == 200
    assert names(client)[-1] == "Băuturi și cocktailuri"
    # același nume, doar altă scriere, pentru aceeași categorie: permis
    assert client.put("/api/categories/11", json={"name": "băuturi și cocktailuri"}).status_code == 200
    assert client.put("/api/categories/11", json={"name": "Salate"}).status_code == 409
    assert client.put("/api/categories/999", json={"name": "X"}).status_code == 404


def test_reorder(client):
    ids = [c["id"] for c in client.get("/api/categories").json()]
    reversed_ids = list(reversed(ids))
    r = client.put("/api/categories/order", json={"ids": reversed_ids})
    assert r.status_code == 200
    assert [c["id"] for c in r.json()] == reversed_ids
    assert client.put("/api/categories/order", json={"ids": ids[:-1]}).status_code == 422
    assert client.put("/api/categories/order", json={"ids": ids + [ids[0]]}).status_code == 422


def test_delete_empty_category(client):
    assert client.delete("/api/categories/11").status_code == 204
    assert "Băuturi" not in names(client)
    assert client.delete("/api/categories/11").status_code == 404


def test_delete_category_with_recipes_requires_move(client):
    rid = client.post("/api/recipes", json={"title": "Limonadă", "category_id": 11}).json()["id"]
    r = client.delete("/api/categories/11")
    assert r.status_code == 409
    assert "1 rețete" in r.json()["detail"]
    assert client.delete("/api/categories/11?move_to=11").status_code == 422
    assert client.delete("/api/categories/11?move_to=999").status_code == 404

    assert client.delete("/api/categories/11?move_to=6").status_code == 204
    assert client.get(f"/api/recipes/{rid}").json()["category_name"] == "Deserturi"
    counts = {c["name"]: c["recipe_count"] for c in client.get("/api/categories").json()}
    assert counts["Deserturi"] == 1
