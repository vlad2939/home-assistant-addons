NO_KEY = {"deepl_key_set": False, "deepl_key_hint": None}


def test_defaults(client):
    assert client.get("/api/settings").json() == {"theme": "auto", "accent": "orange", **NO_KEY}


def test_partial_update(client):
    assert client.put("/api/settings", json={"theme": "dark"}).json() == {"theme": "dark", "accent": "orange", **NO_KEY}
    assert client.put("/api/settings", json={"accent": "green"}).json() == {"theme": "dark", "accent": "green", **NO_KEY}
    assert client.get("/api/settings").json() == {"theme": "dark", "accent": "green", **NO_KEY}


def test_invalid_values(client):
    assert client.put("/api/settings", json={"theme": "roz"}).status_code == 422
    assert client.put("/api/settings", json={"accent": "galben"}).status_code == 422
    assert client.put("/api/settings", json={"translator": "google"}).status_code == 422
