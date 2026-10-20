"""Traducerea rețetelor din engleză în română.

Două variante, alese din Setări:
  - „local”: modelul OPUS-MT engleză→română (din pachetul Argos Translate, licență CC-BY 4.0),
    rulat pe NUC cu CTranslate2. Gratuit, fără cont, fără internet după descărcarea modelului (~70 MB).
  - „deepl”: DeepL API (planul gratuit are 500.000 de caractere pe lună). Calitate mai bună;
    textul rețetei se trimite la DeepL. Cheia se păstrează în setările de pe server.
Denumirile de ingrediente obișnuite se traduc dintr-un dicționar culinar (mai sigur decât traducerea automată).
"""

import hashlib
import os
import re
import shutil
import threading
import time
import zipfile
from pathlib import Path

import httpx

from .. import config
from ..text import fix_romanian

MODEL_URL = "https://argos-net.com/v1/translate-en_ro-1_9.argosmodel"
MODEL_SHA256 = "bf8909d2b1e734f73ef4e892fd53c68fa4a96853b5b786b16da596a5ed258003"
MODEL_MAX_BYTES = 150 * 1024 * 1024
_MODEL_PREFIX = "translate-en_ro-1_9/"
_MODEL_FILES = ("sentencepiece.model", "model/config.json", "model/model.bin", "model/shared_vocabulary.json")

DEEPL_LIMIT_PER_REQUEST = 50


class TranslationError(Exception):
    """Eroare cu mesaj în română, afișat utilizatorului."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


# ---------- modelul local ----------

def model_dir() -> Path:
    return config.data_dir() / "models" / "en_ro"


def model_installed() -> bool:
    return all((model_dir() / f).is_file() for f in _MODEL_FILES)


_download = {"state": "idle", "progress": 0.0, "error": None}
_download_lock = threading.Lock()


def download_status() -> dict:
    return {"installed": model_installed(), **_download}


def start_download() -> dict:
    """Pornește descărcarea modelului în fundal (o singură dată)."""
    with _download_lock:
        if not model_installed() and _download["state"] != "downloading":
            _download.update(state="downloading", progress=0.0, error=None)
            threading.Thread(target=_download_model, daemon=True).start()
    return download_status()


def _download_model() -> None:
    target = model_dir()
    work = target.parent / "en_ro.download"
    try:
        shutil.rmtree(work, ignore_errors=True)
        work.mkdir(parents=True)
        archive = work / "model.zip"
        digest = hashlib.sha256()
        with httpx.stream("GET", MODEL_URL, follow_redirects=True, timeout=60) as r:
            r.raise_for_status()
            total = int(r.headers.get("content-length") or 0) or 71_000_000
            done = 0
            with open(archive, "wb") as out:
                for chunk in r.iter_bytes(1024 * 256):
                    done += len(chunk)
                    if done > MODEL_MAX_BYTES:
                        raise TranslationError("Fișierul modelului este mai mare decât cel așteptat.")
                    digest.update(chunk)
                    out.write(chunk)
                    _download["progress"] = min(done / total, 0.99)
        if digest.hexdigest() != MODEL_SHA256:
            raise TranslationError("Fișierul descărcat nu este cel așteptat (verificarea a eșuat).")
        unpacked = work / "en_ro"
        with zipfile.ZipFile(archive) as z:
            for name in _MODEL_FILES:  # doar fișierele cunoscute, niciodată căi din arhivă
                dest = unpacked / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(z.read(_MODEL_PREFIX + name))
        shutil.rmtree(target, ignore_errors=True)
        unpacked.rename(target)
        _download.update(state="idle", progress=1.0, error=None)
    except TranslationError as e:
        _download.update(state="error", error=str(e))
    except (httpx.HTTPError, OSError, zipfile.BadZipFile, KeyError):
        _download.update(state="error", error="Descărcarea modelului a eșuat. Verifică legătura la internet și încearcă din nou.")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def delete_model() -> None:
    global _translator
    with _translator_lock:
        _translator = None
    shutil.rmtree(model_dir(), ignore_errors=True)


_translator = None
_translator_lock = threading.Lock()
_SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9(\"'])")


def _load():
    global _translator
    with _translator_lock:
        if _translator is None:
            import ctranslate2
            import sentencepiece

            threads = max(1, min(4, os.cpu_count() or 1))
            _translator = (
                ctranslate2.Translator(str(model_dir() / "model"), device="cpu", compute_type="int8", intra_threads=threads),
                sentencepiece.SentencePieceProcessor(model_file=str(model_dir() / "sentencepiece.model")),
            )
        return _translator


# abrevieri pe care modelul nu le cunoaște: „2 tbsp milk” → „2 tablespoons milk” (→ „2 linguri de lapte”)
_ABBREVIATIONS = [
    (re.compile(r"\btbsps?\b", re.IGNORECASE), "tablespoons"),
    (re.compile(r"\btsps?\b", re.IGNORECASE), "teaspoons"),
    (re.compile(r"\bmins?\b", re.IGNORECASE), "minutes"),
    (re.compile(r"\bhrs?\b", re.IGNORECASE), "hours"),
    (re.compile(r"(\d)g\b"), r"\1 g"),
]


def _expand(text: str) -> str:
    for pattern, replacement in _ABBREVIATIONS:
        text = pattern.sub(replacement, text)
    return text


def translate_local(texts: list[str]) -> list[str]:
    if not model_installed():
        raise TranslationError("Modelul de traducere nu este descărcat. Descarcă-l din Setări → Traducere.", 409)
    translator, sp = _load()
    # fiecare text → rânduri → propoziții (modelul traduce mai bine propoziții scurte)
    pieces, layout = [], []
    for text in texts:
        lines = []
        for line in text.split("\n"):
            sentences = [s for s in _SENTENCE.split(line.strip()) if s]
            lines.append((len(pieces), len(sentences)))
            pieces.extend(sentences)
        layout.append(lines)
    tokens = [sp.encode(_expand(p), out_type=str) for p in pieces]
    results = translator.translate_batch(tokens, max_batch_size=16, beam_size=2, max_decoding_length=300) if tokens else []
    out = ["".join(r.hypotheses[0]).replace("▁", " ").strip() for r in results]
    return ["\n".join(" ".join(out[start:start + n]) for start, n in lines) for lines in layout]


# ---------- DeepL ----------

def _deepl_url(key: str, path: str) -> str:
    host = "api-free.deepl.com" if key.strip().endswith(":fx") else "api.deepl.com"
    return f"https://{host}/v2/{path}"


def _deepl_error(r: httpx.Response) -> TranslationError:
    if r.status_code == 403:
        return TranslationError("Cheia DeepL nu este validă. Verific-o în Setări → Traducere.", 400)
    if r.status_code == 456:
        return TranslationError("Ai folosit toată limita lunară DeepL. Folosește traducerea locală până luna viitoare.", 429)
    if r.status_code == 429:
        return TranslationError("DeepL primește prea multe cereri acum. Încearcă din nou peste un minut.", 429)
    return TranslationError(f"DeepL nu a putut traduce (cod {r.status_code}).")


def translate_deepl(texts: list[str], key: str) -> list[str]:
    out = []
    try:
        with httpx.Client(timeout=30) as client:
            for i in range(0, len(texts), DEEPL_LIMIT_PER_REQUEST):
                r = client.post(
                    _deepl_url(key, "translate"),
                    headers={"Authorization": f"DeepL-Auth-Key {key.strip()}"},
                    json={"text": texts[i:i + DEEPL_LIMIT_PER_REQUEST], "source_lang": "EN", "target_lang": "RO",
                          "preserve_formatting": True},
                )
                if r.status_code != 200:
                    raise _deepl_error(r)
                out.extend(t["text"] for t in r.json()["translations"])
    except httpx.HTTPError:
        raise TranslationError("DeepL nu răspunde. Verifică legătura la internet.") from None
    return out


def deepl_usage(key: str) -> dict:
    try:
        r = httpx.get(_deepl_url(key, "usage"), headers={"Authorization": f"DeepL-Auth-Key {key.strip()}"}, timeout=15)
    except httpx.HTTPError:
        raise TranslationError("DeepL nu răspunde. Verifică legătura la internet.") from None
    if r.status_code != 200:
        raise _deepl_error(r)
    data = r.json()
    return {"used": data.get("character_count", 0), "limit": data.get("character_limit", 0)}


# ---------- dicționar culinar (denumiri de ingrediente) ----------

GLOSSARY = {
    "all-purpose flour": "făină albă", "all purpose flour": "făină albă", "plain flour": "făină albă", "flour": "făină",
    "self-raising flour": "făină cu praf de copt", "self-rising flour": "făină cu praf de copt",
    "bread flour": "făină pentru pâine", "strong white bread flour": "făină pentru pâine",
    "whole wheat flour": "făină integrală", "wholemeal flour": "făină integrală",
    "cornstarch": "amidon de porumb", "cornflour": "amidon de porumb",
    "sugar": "zahăr", "white sugar": "zahăr", "granulated sugar": "zahăr", "caster sugar": "zahăr tos",
    "golden caster sugar": "zahăr tos auriu", "brown sugar": "zahăr brun", "light brown sugar": "zahăr brun",
    "dark brown sugar": "zahăr brun închis", "icing sugar": "zahăr pudră", "powdered sugar": "zahăr pudră",
    "confectioners' sugar": "zahăr pudră", "confectioners sugar": "zahăr pudră",
    "baking powder": "praf de copt", "baking soda": "bicarbonat de sodiu", "bicarbonate of soda": "bicarbonat de sodiu",
    "salt": "sare", "kosher salt": "sare grunjoasă", "sea salt": "sare de mare", "salt and pepper": "sare și piper",
    "pepper": "piper", "black pepper": "piper negru", "ground black pepper": "piper negru măcinat",
    "butter": "unt", "unsalted butter": "unt nesărat", "salted butter": "unt sărat",
    "egg": "ou", "eggs": "ouă", "large eggs": "ouă mari", "egg yolks": "gălbenușuri", "egg yolk": "gălbenuș",
    "egg whites": "albușuri", "egg white": "albuș",
    "milk": "lapte", "whole milk": "lapte integral", "buttermilk": "lapte bătut",
    "heavy cream": "smântână pentru frișcă", "heavy whipping cream": "smântână pentru frișcă",
    "double cream": "smântână pentru frișcă", "whipping cream": "smântână pentru frișcă",
    "single cream": "smântână lichidă", "sour cream": "smântână", "cream cheese": "cremă de brânză",
    "greek yogurt": "iaurt grecesc", "yogurt": "iaurt", "natural yogurt": "iaurt natural",
    "parmesan": "parmezan", "grated parmesan": "parmezan ras", "parmesan cheese": "parmezan",
    "olive oil": "ulei de măsline", "extra virgin olive oil": "ulei de măsline extravirgin",
    "vegetable oil": "ulei vegetal", "sunflower oil": "ulei de floarea-soarelui", "canola oil": "ulei de rapiță",
    "garlic": "usturoi", "onion": "ceapă", "onions": "cepe", "yellow onion": "ceapă galbenă", "red onion": "ceapă roșie",
    "green onions": "ceapă verde", "spring onions": "ceapă verde", "scallions": "ceapă verde", "shallot": "eșalotă",
    "shallots": "eșalote", "carrot": "morcov", "carrots": "morcovi", "celery": "țelină apio", "potatoes": "cartofi",
    "tomatoes": "roșii", "tomato paste": "pastă de roșii", "tomato puree": "pastă de roșii",
    "chopped tomatoes": "roșii tăiate din conservă", "canned tomatoes": "roșii din conservă",
    "lemon juice": "suc de lămâie", "lemon": "lămâie", "lime juice": "suc de lime", "lemon zest": "coajă de lămâie",
    "vanilla extract": "extract de vanilie", "vanilla": "vanilie", "cocoa powder": "cacao",
    "dark chocolate": "ciocolată neagră", "milk chocolate": "ciocolată cu lapte", "white chocolate": "ciocolată albă",
    "honey": "miere", "chicken breast": "piept de pui", "chicken breasts": "piept de pui",
    "chicken thighs": "pulpe superioare de pui", "ground beef": "carne tocată de vită", "beef mince": "carne tocată de vită",
    "minced beef": "carne tocată de vită", "ground pork": "carne tocată de porc",
    "chicken stock": "supă de pui", "chicken broth": "supă de pui", "beef stock": "supă de vită",
    "beef broth": "supă de vită", "vegetable stock": "supă de legume", "vegetable broth": "supă de legume",
    "water": "apă", "parsley": "pătrunjel", "fresh parsley": "pătrunjel proaspăt", "coriander": "coriandru",
    "cilantro": "coriandru", "basil": "busuioc", "fresh basil": "busuioc proaspăt", "thyme": "cimbru",
    "rosemary": "rozmarin", "oregano": "oregano", "dill": "mărar", "paprika": "boia", "smoked paprika": "boia afumată",
    "cinnamon": "scorțișoară", "ground cinnamon": "scorțișoară", "nutmeg": "nucșoară", "cumin": "chimion",
    "ground cumin": "chimion măcinat", "rice": "orez", "pasta": "paste", "spaghetti": "spaghete",
    "breadcrumbs": "pesmet", "yeast": "drojdie", "dried yeast": "drojdie uscată", "instant yeast": "drojdie uscată",
    "mushrooms": "ciuperci", "spinach": "spanac", "red bell pepper": "ardei gras roșu", "bell pepper": "ardei gras",
    "zucchini": "dovlecel", "courgette": "dovlecel", "eggplant": "vânătă", "aubergine": "vânătă", "peas": "mazăre",
    "soy sauce": "sos de soia", "dijon mustard": "muștar Dijon", "mustard": "muștar", "mayonnaise": "maioneză",
    "vinegar": "oțet", "white wine": "vin alb", "red wine": "vin roșu", "walnuts": "nuci", "almonds": "migdale",
    "raisins": "stafide", "rolled oats": "fulgi de ovăz", "oats": "fulgi de ovăz", "ginger": "ghimbir",
    "red pepper flakes": "fulgi de chili", "chilli flakes": "fulgi de chili", "chili flakes": "fulgi de chili",
}


def _glossary(name: str) -> str | None:
    key = " ".join(name.lower().replace("’", "'").split())
    return GLOSSARY.get(key)


# ---------- rețeta întreagă ----------

def _polish(text: str, original: str) -> str:
    text = fix_romanian(text) or ""
    if text.endswith(".") and not original.rstrip().endswith((".", "!", "?")):
        text = text[:-1].rstrip()  # „Pentru tort.” → „Pentru tort”
    for bracket in "()":  # paranteze adăugate de model
        if bracket not in original:
            text = text.replace(bracket, "")
    text = " ".join(text.split())
    if original[:1].isupper() and text[:1].islower():
        text = text[0].upper() + text[1:]
    if original[:1].islower() and text[:1].isupper() and not text[1:2].isupper():
        text = text[0].lower() + text[1:]
    return text


def translate_recipe(recipe: dict, engine: str, deepl_key: str | None = None) -> dict:
    """Traduce câmpurile de text ale ciornei. Cantitățile, unitățile și linkurile rămân neschimbate."""
    started = time.monotonic()
    wanted: list[str] = []

    def need(text):
        if text and text.strip() and text not in wanted:
            wanted.append(text)

    for field in ("title", "description", "tips"):
        need(recipe.get(field))
    for step in recipe.get("steps") or []:
        need(step)
    for ing in recipe.get("ingredients") or []:
        if not _glossary(ing.get("name") or ""):
            need(ing.get("name"))
        need(ing.get("note"))
        need(ing.get("group_name"))

    # „TIKKA MASALA PASTE” → „Tikka masala paste” (textul scris doar cu majuscule nu se traduce)
    sent = [t.capitalize() if t.isupper() else t for t in wanted]
    if engine == "deepl":
        if not deepl_key:
            raise TranslationError("Nu ai trecut cheia DeepL. Adaug-o în Setări → Traducere.", 400)
        done = translate_deepl(sent, deepl_key)
    else:
        done = translate_local(sent)
    table = dict(zip(wanted, done))

    def tr(text):
        return _polish(table[text], text) if text in table else text

    result = dict(recipe)
    for field in ("title", "description", "tips"):
        result[field] = tr(recipe.get(field))
    result["steps"] = [tr(s) for s in recipe.get("steps") or []]
    result["ingredients"] = [
        {
            **ing,
            "name": _glossary(ing.get("name") or "") or tr(ing.get("name")),
            "note": tr(ing.get("note")),
            "group_name": tr(ing.get("group_name")),
        }
        for ing in recipe.get("ingredients") or []
    ]
    result["original_language"] = "en-ro"  # tradusă din engleză (bara de traducere nu mai apare)
    return {"recipe": result, "engine": engine, "seconds": round(time.monotonic() - started, 1), "characters": sum(map(len, wanted))}
