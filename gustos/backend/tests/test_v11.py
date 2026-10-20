"""Gustos 1.1: link video la rețete (salvare, import, migrare) și editorul de tag-uri."""

import json
import sqlite3

import pytest

from app import db
from app.services import video
from app.services.scraper import extract_recipe

from test_scraper import page

RECIPE = {"title": "Papanași", "ingredients": [{"name": "brânză"}], "steps": ["Se prăjesc."]}


def create(client, **overrides):
    r = client.post("/api/recipes", json={**RECIPE, **overrides})
    assert r.status_code == 201, r.text
    return r.json()["id"]


# ---------- linkuri video ----------

@pytest.mark.parametrize(
    "url, expected",
    [
        ("https://www.youtube.com/watch?v=HoZFE_V-11E", "https://www.youtube.com/watch?v=HoZFE_V-11E"),
        ("https://youtu.be/HoZFE_V-11E?t=42", "https://www.youtube.com/watch?v=HoZFE_V-11E"),
        ("https://www.youtube.com/embed/8dupHLiq8Yg?feature=oembed", "https://www.youtube.com/watch?v=8dupHLiq8Yg"),
        ("//www.youtube-nocookie.com/embed/8dupHLiq8Yg", "https://www.youtube.com/watch?v=8dupHLiq8Yg"),
        ("https://m.youtube.com/watch?feature=share&v=HoZFE_V-11E", "https://www.youtube.com/watch?v=HoZFE_V-11E"),
        ("https://www.youtube.com/shorts/HoZFE_V-11E", "https://www.youtube.com/watch?v=HoZFE_V-11E"),
        ("https://player.vimeo.com/video/76979871?h=abc", "https://vimeo.com/76979871"),
        ("https://www.facebook.com/watch/?v=123", "https://www.facebook.com/watch/?v=123"),
        ("javascript:alert(1)", None),
        ("", None),
    ],
)
def test_canonical(url, expected):
    assert video.canonical(url) == expected


def test_only_youtube_and_vimeo_are_embeddable():
    assert video.is_embeddable("https://www.youtube.com/watch?v=HoZFE_V-11E")
    assert video.is_embeddable("https://vimeo.com/76979871")
    assert not video.is_embeddable("https://www.facebook.com/watch/?v=123")
    assert not video.is_embeddable("https://www.youtube.com/channel/UCabcdefghijk")


def test_recipe_saves_canonical_video_link(client):
    rid = create(client, video_url=" https://youtu.be/HoZFE_V-11E ")
    assert client.get(f"/api/recipes/{rid}").json()["video_url"] == "https://www.youtube.com/watch?v=HoZFE_V-11E"
    r = client.put(f"/api/recipes/{rid}", json={**RECIPE, "video_url": ""})
    assert r.status_code == 200
    assert client.get(f"/api/recipes/{rid}").json()["video_url"] is None


def test_recipe_rejects_non_http_video_link(client):
    r = client.post("/api/recipes", json={**RECIPE, "video_url": "javascript:alert(1)"})
    assert r.status_code == 422
    assert "Linkul video" in r.text


def test_migration_adds_video_column_to_v1_database(tmp_path):
    path = tmp_path / "vechi.db"
    c = sqlite3.connect(path)
    sql = (db.MIGRATIONS_DIR / "001_initial.sql").read_text(encoding="utf-8")
    c.executescript(f"{sql}\nINSERT INTO recipes (title) VALUES ('Veche');\nPRAGMA user_version = 1;")
    c.close()
    c = db.connect(path)
    assert db.migrate(c) == len(db.migrations())
    assert c.execute("SELECT title, video_url FROM recipes").fetchone()[:] == ("Veche", None)
    c.close()


# ---------- găsirea clipului la import ----------

def test_import_video_from_schema_org():
    data = {"@context": "https://schema.org", "@graph": [
        {"@type": "Recipe", "name": "Salată", "video": {"@type": "VideoObject", "name": "Salată",
         "embedUrl": "https://www.youtube.com/embed/HoZFE_V-11E?feature=oembed"}}]}
    html = page("<article><h2>Ingrediente</h2><ul><li>cartofi</li></ul></article>",
                head=f"<script type='application/ld+json'>{json.dumps(data)}</script>")
    assert extract_recipe(html, "https://jamilacuisine.ro/salata/")["video_url"] == "https://www.youtube.com/watch?v=HoZFE_V-11E"


def test_import_video_from_article_iframe_not_sidebar():
    html = page("""
      <aside class="sidebar"><iframe src="https://www.youtube.com/embed/jFflj12hhNo"></iframe></aside>
      <article class="entry-content"><p>Text</p>
        <iframe data-src="https://www.youtube.com/embed/8dupHLiq8Yg?feature=oembed&enablejsapi=1"></iframe></article>
      <div class="related"><iframe src="https://www.youtube.com/embed/AAAAAAAAAAA"></iframe></div>""")
    assert extract_recipe(html, "https://savoriurbane.com/paine/")["video_url"] == "https://www.youtube.com/watch?v=8dupHLiq8Yg"


def test_import_video_from_lazy_load_placeholder():
    html = page('<article><div class="rll-youtube-player" data-src="https://www.youtube.com/embed/x" data-id="HoZFE_V-11E"></div></article>')
    assert extract_recipe(html, "https://exemplu.ro/r/")["video_url"] == "https://www.youtube.com/watch?v=HoZFE_V-11E"


def test_import_without_video():
    html = page('<article><iframe src="https://www.facebook.com/plugins/like.php"></iframe></article>')
    assert extract_recipe(html, "https://exemplu.ro/r/")["video_url"] is None


# ---------- editorul de tag-uri ----------

def tag_ids(client):
    return {t["name"]: t["id"] for t in client.get("/api/tags").json()}


def search(client, q):
    return [r["title"] for r in client.get("/api/recipes", params={"q": q}).json()["items"]]


def test_rename_tag_updates_recipes_and_search(client):
    rid = create(client, tags=["iarna"])
    r = client.put(f"/api/tags/{tag_ids(client)['iarna']}", json={"name": " Iarnă "})
    assert r.status_code == 200 and r.json()["merged_into"] is None
    assert client.get(f"/api/recipes/{rid}").json()["tags"] == ["iarnă"]
    assert search(client, "iarnă") == ["Papanași"]


def test_rename_to_existing_tag_merges(client):
    a = create(client, title="A", tags=["post"])
    b = create(client, title="B", tags=["de post", "post"])
    create(client, title="C", tags=["de post"])
    ids = tag_ids(client)
    r = client.put(f"/api/tags/{ids['de post']}", json={"name": "Post"})
    assert r.json()["merged_into"] == ids["post"]
    assert [(t["name"], t["recipe_count"]) for t in r.json()["tags"]] == [("post", 3)]
    assert client.get(f"/api/recipes/{a}").json()["tags"] == ["post"]
    assert client.get(f"/api/recipes/{b}").json()["tags"] == ["post"]


def test_delete_tag_keeps_recipes(client):
    rid = create(client, tags=["rapid", "dulce"])
    assert client.delete(f"/api/tags/{tag_ids(client)['rapid']}").status_code == 204
    assert client.get(f"/api/recipes/{rid}").json()["tags"] == ["dulce"]
    assert search(client, "rapid") == []
    assert client.get("/api/stats").json()["tags"] == 1


def test_tag_errors(client):
    create(client, tags=["rapid"])
    assert client.put("/api/tags/999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/tags/999").status_code == 404
    assert client.put(f"/api/tags/{tag_ids(client)['rapid']}", json={"name": "  "}).status_code == 422


def test_video_filter_and_stats(client):
    create(client, title="Cu clip", video_url="https://youtu.be/HoZFE_V-11E")
    create(client, title="Fără clip")
    titles = lambda **p: [r["title"] for r in client.get("/api/recipes", params=p).json()["items"]]
    assert titles(video="true") == ["Cu clip"]
    assert titles(video="false") == ["Fără clip"]
    assert client.get("/api/stats").json()["videos"] == 1
