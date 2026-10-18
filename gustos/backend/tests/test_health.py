from app import config


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "version": config.version()}


def test_about_contains_copyright(client):
    r = client.get("/api/about")
    assert r.status_code == 200
    assert r.json()["copyright"] == "© concept și realizare vlad39"


def test_unknown_api_is_404(client):
    assert client.get("/api/nu-exista").status_code == 404


def test_root_serves_page(client):
    assert client.get("/").status_code == 200
