def test_defaults(client):
    assert client.get("/api/settings").json() == {"theme": "auto", "accent": "orange"}


def test_partial_update(client):
    assert client.put("/api/settings", json={"theme": "dark"}).json() == {"theme": "dark", "accent": "orange"}
    assert client.put("/api/settings", json={"accent": "green"}).json() == {"theme": "dark", "accent": "green"}
    assert client.get("/api/settings").json() == {"theme": "dark", "accent": "green"}


def test_invalid_values(client):
    assert client.put("/api/settings", json={"theme": "roz"}).status_code == 422
    assert client.put("/api/settings", json={"accent": "galben"}).status_code == 422
