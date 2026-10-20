"""Gustos 2 – etapa 11: galeria foto a rețetei."""

import io
import zipfile

from app.services import photos

from test_photos import jpeg_bytes, new_recipe, upload


def add(client, rid, *datas):
    files = [("files", (f"p{i}.jpg", d, "image/jpeg")) for i, d in enumerate(datas)]
    r = client.post(f"/api/recipes/{rid}/gallery", files=files)
    assert r.status_code == 200, r.text
    return r.json()


def test_add_several_photos_and_bad_file_does_not_stop_others(client):
    rid = new_recipe(client)
    result = add(client, rid, jpeg_bytes(800, 600), b"nu e poza", jpeg_bytes(600, 800))
    assert len(result["gallery"]) == 2
    assert len(result["errors"]) == 1 and "p1.jpg" in result["errors"][0]
    recipe = client.get(f"/api/recipes/{rid}").json()
    assert [g["id"] for g in recipe["gallery"]] == [g["id"] for g in result["gallery"]]
    for g in recipe["gallery"]:
        assert (photos.photos_dir() / photos.thumb_name(g["photo"])).is_file()


def test_make_cover_swaps_with_current_cover(client):
    rid = new_recipe(client)
    cover = upload(client, rid, jpeg_bytes()).json()["photo"]
    gallery = add(client, rid, jpeg_bytes(500, 500))["gallery"]
    r = client.post(f"/api/recipes/{rid}/gallery/{gallery[0]['id']}/cover").json()
    assert r["photo"] == gallery[0]["photo"]
    assert [g["photo"] for g in r["gallery"]] == [cover]
    assert client.get(f"/api/recipes/{rid}").json()["photo"] == gallery[0]["photo"]


def test_make_cover_without_cover_moves_photo_out_of_gallery(client):
    rid = new_recipe(client)
    gallery = add(client, rid, jpeg_bytes(500, 500))["gallery"]
    r = client.post(f"/api/recipes/{rid}/gallery/{gallery[0]['id']}/cover").json()
    assert r["photo"] == gallery[0]["photo"] and r["gallery"] == []


def test_delete_and_reorder(client):
    rid = new_recipe(client)
    g = add(client, rid, jpeg_bytes(400, 300), jpeg_bytes(300, 400), jpeg_bytes(300, 300))["gallery"]
    ids = [x["id"] for x in g]
    assert [x["id"] for x in client.put(f"/api/recipes/{rid}/gallery/order", json={"ids": ids[::-1]}).json()] == ids[::-1]
    assert client.put(f"/api/recipes/{rid}/gallery/order", json={"ids": ids[:2]}).status_code == 422
    assert client.delete(f"/api/recipes/{rid}/gallery/{ids[0]}").status_code == 204
    assert not (photos.photos_dir() / g[0]["photo"]).exists()
    assert [x["id"] for x in client.get(f"/api/recipes/{rid}/gallery").json()] == [ids[2], ids[1]]


def test_photo_of_other_recipe_is_not_found(client):
    a, b = new_recipe(client), new_recipe(client)
    g = add(client, a, jpeg_bytes(300, 300))["gallery"]
    assert client.delete(f"/api/recipes/{b}/gallery/{g[0]['id']}").status_code == 404
    assert client.post(f"/api/recipes/{b}/gallery/{g[0]['id']}/cover").status_code == 404


def test_deleting_recipe_removes_gallery_files(client):
    rid = new_recipe(client)
    g = add(client, rid, jpeg_bytes(300, 300))["gallery"]
    client.delete(f"/api/recipes/{rid}")
    assert not (photos.photos_dir() / g[0]["photo"]).exists()
    assert not (photos.photos_dir() / photos.thumb_name(g[0]["photo"])).exists()


def test_gallery_limit(client, monkeypatch):
    from app.routers import gallery

    monkeypatch.setattr(gallery, "MAX_GALLERY", 2)
    rid = new_recipe(client)
    result = add(client, rid, jpeg_bytes(300, 300), jpeg_bytes(300, 300), jpeg_bytes(300, 300))
    assert len(result["gallery"]) == 2 and "maximul" in result["errors"][0]


def test_backup_includes_gallery_photos(client):
    rid = new_recipe(client)
    g = add(client, rid, jpeg_bytes(300, 300))["gallery"]
    r = client.get("/api/backup/export")
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert f"photos/{g[0]['photo']}" in names and f"photos/{photos.thumb_name(g[0]['photo'])}" in names
