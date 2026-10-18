import io

from PIL import Image

from app.services import photos


def jpeg_bytes(width=2400, height=1200, orientation=None, gps=False):
    """JPEG de test; orientation=6 înseamnă „telefon ținut vertical” (trebuie rotit 90°)."""
    image = Image.new("RGB", (width, height), (200, 120, 40))
    exif = Image.Exif()
    if orientation:
        exif[0x0112] = orientation
    if gps:
        exif[0x010F] = "Tableta"  # producător, ca dată EXIF oarecare
    buf = io.BytesIO()
    image.save(buf, "JPEG", exif=exif.tobytes())
    return buf.getvalue()


def new_recipe(client):
    return client.post("/api/recipes", json={"title": "Cu poză"}).json()["id"]


def upload(client, recipe_id, data, filename="poza.jpg"):
    return client.post(f"/api/recipes/{recipe_id}/photo", files={"file": (filename, data, "image/jpeg")})


def test_upload_resizes_and_creates_thumbnail(client):
    rid = new_recipe(client)
    r = upload(client, rid, jpeg_bytes())
    assert r.status_code == 200
    name = r.json()["photo"]
    assert photos.is_valid_name(name)
    large = Image.open(photos.photos_dir() / name)
    thumb = Image.open(photos.photos_dir() / photos.thumb_name(name))
    assert large.format == "WEBP" and large.size == (1600, 800)
    assert thumb.size == (480, 240)
    assert client.get(f"/api/recipes/{rid}").json()["photo"] == name


def test_exif_orientation_applied_and_removed(client):
    rid = new_recipe(client)
    name = upload(client, rid, jpeg_bytes(1200, 800, orientation=6, gps=True)).json()["photo"]
    large = Image.open(photos.photos_dir() / name)
    assert large.size == (800, 1200)  # rotită corect: portret
    assert not large.getexif()  # fără date EXIF


def test_small_image_not_enlarged(client):
    rid = new_recipe(client)
    name = upload(client, rid, jpeg_bytes(300, 200)).json()["photo"]
    assert Image.open(photos.photos_dir() / name).size == (300, 200)


def test_png_with_transparency(client):
    rid = new_recipe(client)
    buf = io.BytesIO()
    Image.new("RGBA", (100, 100), (0, 0, 0, 0)).save(buf, "PNG")
    r = upload(client, rid, buf.getvalue(), "poza.png")
    assert r.status_code == 200


def test_replacing_photo_deletes_old_files(client):
    rid = new_recipe(client)
    first = upload(client, rid, jpeg_bytes()).json()["photo"]
    second = upload(client, rid, jpeg_bytes()).json()["photo"]
    assert first != second
    assert not (photos.photos_dir() / first).exists()
    assert not (photos.photos_dir() / photos.thumb_name(first)).exists()
    assert (photos.photos_dir() / second).exists()


def test_remove_photo(client):
    rid = new_recipe(client)
    name = upload(client, rid, jpeg_bytes()).json()["photo"]
    assert client.delete(f"/api/recipes/{rid}/photo").status_code == 204
    assert client.get(f"/api/recipes/{rid}").json()["photo"] is None
    assert not (photos.photos_dir() / name).exists()


def test_delete_recipe_deletes_photo(client):
    rid = new_recipe(client)
    name = upload(client, rid, jpeg_bytes()).json()["photo"]
    client.delete(f"/api/recipes/{rid}")
    assert list(photos.photos_dir().iterdir()) == []
    assert name


def test_invalid_file_rejected(client):
    rid = new_recipe(client)
    r = upload(client, rid, b"nu sunt o imagine", "text.jpg")
    assert r.status_code == 422
    assert "imagine" in r.json()["detail"]


def test_too_large_rejected(client, monkeypatch):
    monkeypatch.setattr(photos, "MAX_UPLOAD_BYTES", 1000)
    rid = new_recipe(client)
    assert upload(client, rid, jpeg_bytes()).status_code == 413


def test_upload_for_missing_recipe(client):
    assert upload(client, 999, jpeg_bytes()).status_code == 404
    assert list(photos.photos_dir().iterdir()) == []


def test_serve_photo(client):
    rid = new_recipe(client)
    name = upload(client, rid, jpeg_bytes()).json()["photo"]
    r = client.get(f"/photos/{name}")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/webp"
    assert client.get(f"/photos/{photos.thumb_name(name)}").status_code == 200


def test_serve_photo_rejects_bad_names(client):
    assert client.get("/photos/..%2Fgustos.db").status_code == 404
    assert client.get("/photos/nu-exista.webp").status_code == 404
    assert client.get("/photos/" + "0" * 32 + ".webp").status_code == 404
