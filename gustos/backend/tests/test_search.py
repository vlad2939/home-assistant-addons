import pytest

from app.services.search import fts_query


def add(client, title, **extra):
    payload = {"title": title, **extra}
    r = client.post("/api/recipes", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.fixture
def recipes(client):
    ids = {
        "supa": add(client, "Supă cu tăiței de casă", category_id=1, prep_time=20, cook_time=40,
                    tags=["rapid"], ingredients=[{"name": "tăiței"}, {"name": "pui"}, {"name": "morcov"}]),
        "ciorba": add(client, "Ciorbă de perişoare", category_id=1, prep_time=30, cook_time=60,
                      tags=["tradițional"], ingredients=[{"name": "carne tocată"}, {"name": "orez"},
                                                         {"name": "ceapă"}]),
        "papanasi": add(client, "Papanași", category_id=6, prep_time=20, cook_time=15,
                        description="Cu smântână și dulceață", tags=["tradițional", "dulce"],
                        ingredients=[{"name": "brânză de vaci"}, {"name": "ouă"}],
                        source_url="https://jamilacuisine.ro/papanasi"),
        "ardei": add(client, "Ardei umpluți", category_id=2,
                     ingredients=[{"name": "ardei gras"}, {"name": "carne tocată"}, {"name": "Ceapă roșie"}]),
    }
    client.post(f"/api/recipes/{ids['papanasi']}/favorite")
    return ids


def titles(client, **params):
    r = client.get("/api/recipes", params=params)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == len(data["items"])
    return [i["title"] for i in data["items"]]


def test_fts_query_is_safe():
    assert fts_query('tăiţei "AND" (x*') == '"taitei"* "and"* "x"*'
    assert fts_query("  -- ") is None
    assert fts_query(None) is None


def test_search_without_diacritics(client, recipes):
    assert titles(client, q="taitei") == ["Supă cu tăiței de casă"]
    assert titles(client, q="PERISOARE") == ["Ciorbă de perișoare"]
    assert titles(client, q="perişoare") == ["Ciorbă de perișoare"]


def test_search_prefix_and_all_words(client, recipes):
    assert titles(client, q="papa") == ["Papanași"]
    assert titles(client, q="ciorba orez") == ["Ciorbă de perișoare"]
    assert titles(client, q="ciorba papanasi") == []


def test_search_in_ingredients_description_tags(client, recipes):
    assert set(titles(client, q="carne")) == {"Ciorbă de perișoare", "Ardei umpluți"}
    assert titles(client, q="smantana") == ["Papanași"]
    assert set(titles(client, q="traditional")) == {"Ciorbă de perișoare", "Papanași"}


def test_title_match_ranks_first(client, recipes):
    add(client, "Salată de ardei copți", ingredients=[{"name": "ardei"}])
    found = titles(client, q="ardei")
    assert len(found) == 2
    add(client, "Tocăniță", description="Se servește cu ardei", ingredients=[{"name": "cartofi"}])
    assert titles(client, q="ardei")[-1] == "Tocăniță"


def test_filters_combined(client, recipes):
    assert titles(client, category=1, sort="title") == ["Ciorbă de perișoare", "Supă cu tăiței de casă"]
    assert titles(client, ingredient="ceapa", sort="title") == ["Ardei umpluți", "Ciorbă de perișoare"]
    assert titles(client, ingredient=["ceapa", "orez"]) == ["Ciorbă de perișoare"]
    assert titles(client, tags="Tradițional", sort="title") == ["Ciorbă de perișoare", "Papanași"]
    assert titles(client, tags=["tradițional", "dulce"]) == ["Papanași"]
    assert titles(client, favorite="true") == ["Papanași"]
    assert titles(client, source="jamilacuisine.ro") == ["Papanași"]
    assert titles(client, q="carne", category=2) == ["Ardei umpluți"]
    assert titles(client, q="carne", category=6) == []


def test_sort_orders(client, recipes):
    assert titles(client, sort="title") == ["Ardei umpluți", "Ciorbă de perișoare", "Papanași", "Supă cu tăiței de casă"]
    assert titles(client)[0] == "Ardei umpluți"  # implicit: cele mai recente
    # după timp: cele fără timp ajung la final
    assert titles(client, sort="time") == ["Papanași", "Supă cu tăiței de casă", "Ciorbă de perișoare", "Ardei umpluți"]


def test_romanian_alphabetical_order(client):
    for t in ["Zacuscă", "Ălivenci", "Șnițel", "Salată", "Înghețată", "Ignat"]:
        add(client, t)
    assert titles(client, sort="title") == ["Ălivenci", "Ignat", "Înghețată", "Salată", "Șnițel", "Zacuscă"]


def test_ingredient_autocomplete(client, recipes):
    names = [i["name"] for i in client.get("/api/ingredients", params={"prefix": "cea"}).json()]
    assert names == ["ceapă", "Ceapă roșie"]
    assert [i["name"] for i in client.get("/api/ingredients", params={"prefix": "rosi"}).json()] == ["Ceapă roșie"]
    carne = client.get("/api/ingredients", params={"prefix": "carne"}).json()
    assert carne == [{"name": "carne tocată", "recipe_count": 2}]
    assert client.get("/api/ingredients", params={"prefix": ""}).json() == []


def test_tags_list(client, recipes):
    tags = {t["name"]: t["recipe_count"] for t in client.get("/api/tags").json()}
    assert tags == {"dulce": 1, "rapid": 1, "tradițional": 2}
    assert [t["name"] for t in client.get("/api/tags", params={"prefix": "TRA"}).json()] == ["tradițional"]


def test_card_fields(client, recipes):
    item = client.get("/api/recipes", params={"q": "papanasi"}).json()["items"][0]
    assert item["favorite"] is True
    assert item["total_time"] == 35
    assert item["category_name"] == "Deserturi"
    assert item["tags"] == ["dulce", "tradițional"]
