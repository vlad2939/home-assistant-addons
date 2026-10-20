"""Gustos 1.5: rețete în engleză – unități, °F → °C, categorii și traducerea în română."""

import hashlib
import io
import json
import zipfile

import httpx
import pytest

from app.services import translate
from app.services.english import to_metric
from app.services.ingredient_parser import parse_ingredient
from app.services.scraper import extract_recipe

from test_scraper import page


# ---------- ingrediente în engleză ----------

@pytest.mark.parametrize(
    "line, quantity, quantity_text, unit, name, note",
    [
        ("2 cups all-purpose flour, sifted", 2, None, "cană", "all-purpose flour", "sifted"),
        ("1 ½ tbsp cocoa powder", 1.5, None, "lingură", "cocoa powder", None),
        ("8 oz cream cheese, softened", 225, None, "g", "cream cheese", "softened"),
        ("1 lb ground beef", 455, None, "g", "ground beef", None),
        ("a pinch of salt", None, "un praf", None, "salt", None),
        ("2 to 3 cloves garlic, minced", None, "2-3", "cățel", "garlic", "minced"),
        ("4-6 oz pasta", None, "115-170", "g", "pasta", None),
        ("1 heaped tsp baking powder", 1, None, "linguriță", "baking powder", "heaped"),
        ("1 (14 ounce) can coconut milk", 1, None, "conservă", "coconut milk", "14 ounce"),
        ("3 large eggs", 3, None, None, "large eggs", None),
    ],
)
def test_english_ingredients(line, quantity, quantity_text, unit, name, note):
    r = parse_ingredient(line, lang="en")
    assert (r["quantity"], r["quantity_text"], r["unit"], r["name"], r["note"]) == (quantity, quantity_text, unit, name, note)


def test_english_to_taste():
    assert parse_ingredient("salt and pepper, to taste", lang="en")["unit"] == "la gust"


def test_romanian_parsing_unchanged():
    assert parse_ingredient("o lingură de zahăr")["unit"] == "lingură"
    assert parse_ingredient("a pinch of salt")["unit"] is None  # fără lang="en", „a” nu e cantitate


@pytest.mark.parametrize(
    "text, expected",
    [
        ("Preheat oven to 350°F (175°C).", "Preheat oven to 175°C."),
        ("Bake at 400 degrees F for 20 min", "Bake at 200°C for 20 min"),
        ("Heat to 425F.", "Heat to 220°C."),
        ("Use a 9x13-inch pan", "Use a 23x33 cm pan"),
        ("two 8 inch round tins", "two 20 cm round tins"),
        ("Heat oven to 190C/170C fan/gas 5", "Heat oven to 190C/170C fan/gas 5"),
        ("Cook for 5 minutes.", "Cook for 5 minutes."),
    ],
)
def test_to_metric(text, expected):
    assert to_metric(text) == expected


def test_english_import_uses_english_units_and_celsius():
    data = {"@context": "https://schema.org", "@type": "Recipe", "name": "Easy chocolate cake",
            "recipeIngredient": ["2 cups flour", "1 tsp baking soda", "8 oz butter"],
            "recipeInstructions": [{"@type": "HowToStep", "text": "Preheat the oven to 350°F."},
                                   {"@type": "HowToStep", "text": "Bake in a 9-inch pan."}]}
    html = page("<article><p>Cake</p></article>", head=f"<script type='application/ld+json'>{json.dumps(data)}</script>", lang="en-US")
    draft = extract_recipe(html, "https://www.bbcgoodfood.com/recipes/cake")
    assert draft["original_language"] == "en"
    assert [(i["quantity"], i["unit"], i["name"]) for i in draft["ingredients"]] == [
        (2, "cană", "flour"), (1, "linguriță", "baking soda"), (225, "g", "butter")]
    assert draft["steps"] == ["Preheat the oven to 180°C.", "Bake in a 23 cm pan."]


def test_english_category_guess(client):
    from app import db
    from app.services.categorize import guess_category

    conn = db.connect()
    names = {r["id"]: r["name"] for r in conn.execute("SELECT id, name FROM categories")}
    guess = lambda t: names.get(guess_category(conn, t))  # noqa: E731
    assert guess("Easy chocolate cake") == "Deserturi"
    assert guess("Tomato soup") == "Supe și ciorbe"
    assert guess("Banana bread") == "Panificație și patiserie"
    assert guess("Greek salad") == "Salate"
    assert guess("Chicken pot pie") == "Fel principal"
    assert guess("Apple pie") == "Deserturi"
    assert guess("Tartine cu avocado") == "Aperitive"
    conn.close()


# ---------- traducerea ----------

DRAFT = {
    "title": "Easy chocolate cake",
    "description": None,
    "steps": ["Heat the oven. Butter the tins.", "Bake for 20 mins."],
    "tips": "Keeps for 3 days.",
    "ingredients": [
        {"group_name": "For the icing", "quantity": 200, "unit": "g", "name": "icing sugar", "note": None},
        {"group_name": "For the icing", "quantity": 1, "unit": "lingură", "name": "Cocoa Powder", "note": "sifted"},
        {"group_name": None, "quantity": 2, "unit": None, "name": "golden syrup", "note": None},
    ],
    "source_url": "https://www.bbcgoodfood.com/recipes/cake",
    "original_language": "en",
}


@pytest.fixture
def fake_local(monkeypatch):
    """Traducere „falsă”: [RO] în față, ca să se vadă ce s-a trimis la model."""
    sent = []

    def fake(texts):
        sent.extend(texts)
        return [f"[RO] {t}" for t in texts]

    monkeypatch.setattr(translate, "translate_local", fake)
    return sent


def test_translate_recipe_uses_glossary_and_keeps_amounts(fake_local):
    result = translate.translate_recipe(DRAFT, "local")["recipe"]
    assert [i["name"] for i in result["ingredients"]] == ["zahăr pudră", "cacao", "[RO] golden syrup"]
    assert [(i["quantity"], i["unit"]) for i in result["ingredients"]] == [(200, "g"), (1, "lingură"), (2, None)]
    assert result["ingredients"][0]["group_name"] == "[RO] For the icing"
    assert result["steps"] == ["[RO] Heat the oven. Butter the tins.", "[RO] Bake for 20 mins."]
    assert result["source_url"] == DRAFT["source_url"] and result["original_language"] == "en-ro"
    # fiecare text se trimite o singură dată, iar denumirile din dicționar deloc
    assert fake_local.count("For the icing") == 1 and "icing sugar" not in fake_local


def test_translate_api_with_local_engine(client, fake_local):
    r = client.post("/api/translate", json={"recipe": DRAFT})
    assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "local" and body["warning"] is None
    assert body["recipe"]["title"] == "[RO] Easy chocolate cake"


def test_translate_api_without_model(client):
    r = client.post("/api/translate", json={"recipe": DRAFT})
    assert r.status_code == 409
    assert "Setări → Traducere" in r.json()["detail"]


def test_local_translation_splits_sentences_and_lines(monkeypatch):
    class Hyp:
        def __init__(self, tokens):
            self.hypotheses = [tokens]

    class Translator:
        def translate_batch(self, batch, **kw):
            return [Hyp(["▁RO:"] + tokens) for tokens in batch]

    class SP:
        def encode(self, text, out_type=str):
            return ["▁" + w for w in text.split()]

    monkeypatch.setattr(translate, "model_installed", lambda: True)
    monkeypatch.setattr(translate, "_load", lambda: (Translator(), SP()))
    assert translate.translate_local(["Heat oven. Mix well.\nServe."]) == ["RO: Heat oven. RO: Mix well.\nRO: Serve."]


# ---------- DeepL ----------

def _mock_httpx(monkeypatch, handler):
    real = httpx.Client
    monkeypatch.setattr(translate.httpx, "Client", lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    monkeypatch.setattr(translate.httpx, "get", lambda url, **kw: real(transport=httpx.MockTransport(handler)).get(url, **kw))


def test_deepl_free_key_uses_free_endpoint(monkeypatch):
    seen = []

    def handler(request):
        seen.append((request.url.host, request.headers["authorization"], json.loads(request.content)))
        texts = json.loads(request.content)["text"]
        return httpx.Response(200, json={"translations": [{"text": f"RO {t}"} for t in texts]})

    _mock_httpx(monkeypatch, handler)
    assert translate.translate_deepl(["Bake.", "Serve."], "abc:fx") == ["RO Bake.", "RO Serve."]
    host, auth, payload = seen[0]
    assert host == "api-free.deepl.com" and auth == "DeepL-Auth-Key abc:fx"
    assert payload["source_lang"] == "EN" and payload["target_lang"] == "RO"


@pytest.mark.parametrize("status, words", [(403, "nu este validă"), (456, "limita lunară"), (500, "cod 500")])
def test_deepl_errors_in_romanian(monkeypatch, status, words):
    _mock_httpx(monkeypatch, lambda request: httpx.Response(status))
    with pytest.raises(translate.TranslationError) as e:
        translate.translate_deepl(["x"], "abc:fx")
    assert words in str(e.value)


def test_deepl_fallback_to_local(client, monkeypatch, fake_local):
    client.put("/api/settings", json={"translator": "deepl", "deepl_key": "abc:fx"})
    _mock_httpx(monkeypatch, lambda request: httpx.Response(456))
    monkeypatch.setattr(translate, "model_installed", lambda: True)
    body = client.post("/api/translate", json={"recipe": DRAFT}).json()
    assert body["engine"] == "local" and "limita lunară" in body["warning"]


def test_deepl_key_is_never_returned(client):
    s = client.put("/api/settings", json={"translator": "deepl", "deepl_key": " 1234-abcd:fx "}).json()
    assert "deepl_key" not in s and s["deepl_key_set"] is True and s["deepl_key_hint"] == "d:fx"
    assert client.get("/api/translate/status").json()["deepl"]["configured"] is True
    s = client.put("/api/settings", json={"deepl_key": ""}).json()
    assert s["deepl_key_set"] is False and s["translator"] == "deepl"


# ---------- descărcarea modelului ----------

def _model_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name in translate._MODEL_FILES:
            z.writestr(translate._MODEL_PREFIX + name, f"conținut {name}")
        z.writestr(translate._MODEL_PREFIX + "../../rau.txt", "nu trebuie extras")
    return buf.getvalue()


def _serve(monkeypatch, content: bytes):
    def stream(method, url, **kw):
        client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, content=content)))
        return client.stream(method, url)

    monkeypatch.setattr(translate.httpx, "stream", stream)


def test_model_download_checks_hash_and_extracts_only_known_files(monkeypatch, data_dir):
    content = _model_zip()
    monkeypatch.setattr(translate, "MODEL_SHA256", hashlib.sha256(content).hexdigest())
    _serve(monkeypatch, content)
    translate._download_model()
    assert translate.download_status()["installed"] is True
    assert sorted(p.name for p in (data_dir / "models" / "en_ro").rglob("*") if p.is_file()) == sorted(
        n.split("/")[-1] for n in translate._MODEL_FILES)
    assert not list(data_dir.rglob("rau.txt"))
    translate.delete_model()
    assert translate.model_installed() is False


def test_model_download_rejects_wrong_file(monkeypatch):
    _serve(monkeypatch, _model_zip())  # hash-ul nu se potrivește cu cel oficial
    translate._download_model()
    status = translate.download_status()
    assert status["installed"] is False and status["state"] == "error"
    assert "verificarea a eșuat" in status["error"]


def test_english_note_references_and_alternative_measures():
    r = parse_ingredient("4 chicken thighs, bone-in, skin on (~250g/8oz each) (Note 1)", lang="en")
    assert (r["name"], r["note"]) == ("chicken thighs, bone-in, skin on", "~250g/8oz each")
    assert parse_ingredient("4 chicken drumsticks (Note 1)", lang="en")["note"] is None
    r = parse_ingredient("30g / 2 tbsp unsalted butter", lang="en")
    assert (r["quantity"], r["unit"], r["name"]) == (30, "g", "unsalted butter")


def test_uppercase_text_is_sent_capitalized(fake_local):
    draft = {**DRAFT, "ingredients": [{**DRAFT["ingredients"][2], "group_name": "TIKKA MASALA PASTE"}]}
    result = translate.translate_recipe(draft, "local")["recipe"]
    assert "Tikka masala paste" in fake_local
    assert result["ingredients"][0]["group_name"] == "[RO] Tikka masala paste"
