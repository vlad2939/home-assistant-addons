"""Importul prin API, fără internet: descărcarea este simulată."""

import io
import socket

import httpx
import pytest
from PIL import Image

from app.services import fetch

RECIPE_HTML = """<html lang="ro"><head><meta property="og:title" content="Ciorbă de test"></head><body>
<div class="entry-content"><h2>Ingrediente</h2><ul><li>500 g carne</li><li>un praf de sare</li></ul>
<h2>Mod de preparare</h2><p>Se fierbe carnea o oră la foc mic.</p></div></body></html>"""


def jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (800, 600), (10, 120, 60)).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture
def web(monkeypatch):
    """Internet simulat: url → (status, headers, conținut). Toate numele de site rezolvă la o adresă publică."""
    pages = {}

    def handler(request: httpx.Request):
        status, headers, body = pages.get(str(request.url), (404, {}, b""))
        return httpx.Response(status, headers=headers, content=body)

    real_client = httpx.Client
    monkeypatch.setattr(fetch.httpx, "Client", lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw))
    monkeypatch.setattr(fetch.socket, "getaddrinfo", lambda host, port: [(None, None, None, None, ("93.184.216.34", 0))])
    return pages


def test_preview_extracts_and_saves_nothing(client, web):
    web["https://jamilacuisine.ro/ciorba/"] = (200, {"content-type": "text/html; charset=utf-8"}, RECIPE_HTML.encode())
    r = client.post("/api/import/preview", json={"url": "https://jamilacuisine.ro/ciorba/"})
    assert r.status_code == 200, r.text
    draft = r.json()["draft"]
    assert draft["title"] == "Ciorbă de test"
    assert [(i["quantity"], i["quantity_text"], i["unit"], i["name"]) for i in draft["ingredients"]] == [
        (500, None, "g", "carne"), (None, "un praf", None, "sare")]
    assert draft["steps"] == ["Se fierbe carnea o oră la foc mic."]
    assert draft["category_id"] == 1  # Supe și ciorbe
    assert r.json()["duplicates"] == []
    assert client.get("/api/stats").json()["recipes"] == 0


def test_site_not_allowed(client, web):
    r = client.post("/api/import/preview", json={"url": "https://exemplu.com/reteta"})
    assert r.status_code == 403
    assert "Setări" in r.json()["detail"]


def test_www_and_subdomain_allowed(client, web):
    web["https://www.lauraadamache.ro/x.html"] = (200, {"content-type": "text/html"}, RECIPE_HTML.encode())
    assert client.post("/api/import/preview", json={"url": "https://www.lauraadamache.ro/x.html"}).status_code == 200


def test_inactive_site_refused(client, web, conn):
    conn.execute("UPDATE import_sites SET active = 0 WHERE domain = 'teoskitchen.ro'")
    conn.commit()
    assert client.post("/api/import/preview", json={"url": "https://teoskitchen.ro/a.html"}).status_code == 403


def test_redirect_to_other_site_blocked(client, web):
    web["https://adihadean.ro/r/"] = (301, {"location": "https://rau.example/capcana"}, b"")
    r = client.post("/api/import/preview", json={"url": "https://adihadean.ro/r/"})
    assert r.status_code == 422
    assert "nu este în lista" in r.json()["detail"]


def test_local_network_blocked(client, web, monkeypatch):
    monkeypatch.setattr(fetch.socket, "getaddrinfo", lambda host, port: [(None, None, None, None, ("192.168.1.10", 0))])
    r = client.post("/api/import/preview", json={"url": "https://adihadean.ro/x/"})
    assert r.status_code == 422
    assert "rețeaua locală" in r.json()["detail"]


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.5", "169.254.1.1", "::1", "fd00::1"])
def test_private_addresses_rejected(monkeypatch, address):
    monkeypatch.setattr(fetch.socket, "getaddrinfo", lambda host, port: [(None, None, None, None, (address, 0))])
    with pytest.raises(fetch.FetchError):
        fetch.check_public_host("orice.ro")


def test_unknown_host(monkeypatch):
    def fail(host, port):
        raise socket.gaierror

    monkeypatch.setattr(fetch.socket, "getaddrinfo", fail)
    with pytest.raises(fetch.FetchError):
        fetch.check_public_host("nu-exista.ro")


@pytest.mark.parametrize("url", ["ftp://jamilacuisine.ro/x", "javascript:alert(1)", "https://user:parola@jamilacuisine.ro/", "https://jamilacuisine.ro:8080/"])
def test_bad_urls(client, url):
    r = client.post("/api/import/preview", json={"url": url})
    assert r.status_code == 422


def test_page_too_large(client, web, monkeypatch):
    monkeypatch.setattr(fetch, "MAX_PAGE_BYTES", 100)
    web["https://jamilacuisine.ro/mare/"] = (200, {"content-type": "text/html"}, b"x" * 500)
    r = client.post("/api/import/preview", json={"url": "https://jamilacuisine.ro/mare/"})
    assert r.status_code == 422
    assert "prea mare" in r.json()["detail"]


def test_http_error(client, web):
    r = client.post("/api/import/preview", json={"url": "https://jamilacuisine.ro/lipsa/"})
    assert r.status_code == 422
    assert "404" in r.json()["detail"]


def test_duplicates_detected(client, web):
    client.post("/api/recipes", json={"title": "Deja importată", "source_url": "http://jamilacuisine.ro/ciorba"})
    web["https://jamilacuisine.ro/ciorba/"] = (200, {"content-type": "text/html"}, RECIPE_HTML.encode())
    r = client.post("/api/import/preview", json={"url": "https://jamilacuisine.ro/ciorba/"})
    assert [d["title"] for d in r.json()["duplicates"]] == ["Deja importată"]


def test_photo_from_url(client, web):
    rid = client.post("/api/recipes", json={"title": "Cu poză"}).json()["id"]
    web["https://cdn.exemplu.ro/poza.jpg"] = (200, {"content-type": "image/jpeg"}, jpeg())
    r = client.post(f"/api/recipes/{rid}/photo-from-url", json={"url": "https://cdn.exemplu.ro/poza.jpg"})
    assert r.status_code == 200, r.text
    assert client.get(f"/api/recipes/{rid}").json()["photo"] == r.json()["photo"]


def test_photo_from_url_rejects_non_image(client, web):
    rid = client.post("/api/recipes", json={"title": "Cu poză"}).json()["id"]
    web["https://cdn.exemplu.ro/pagina"] = (200, {"content-type": "text/html"}, b"<html></html>")
    assert client.post(f"/api/recipes/{rid}/photo-from-url", json={"url": "https://cdn.exemplu.ro/pagina"}).status_code == 422


def test_import_sites_list(client):
    sites = client.get("/api/import-sites").json()
    assert len(sites) == 7 and all(s["active"] == 1 for s in sites)
