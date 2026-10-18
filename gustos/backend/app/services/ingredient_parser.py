"""Descompunerea unui rând de ingredient în română: cantitate, unitate, denumire, notă.

Exemple:
    „500 g făină albă”                 → 500, g, „făină albă”
    „1–2 căței de usturoi, zdrobiți”   → „1-2” (text), cățel, „usturoi”, notă „zdrobiți”
    „un praf de sare”                  → „un praf” (text), –, „sare”
    „sare, piper, după gust”           → –, la gust, „sare, piper”
Dacă rândul nu poate fi înțeles, rămâne întreg în denumire, pentru corectare manuală.
Funcționează și pe texte scrise fără diacritice („lingurita”, „catei”).
"""

import re

from ..text import fix_romanian, normalize

# unitate canonică → variante (fără diacritice, litere mici)
UNIT_ALIASES = {
    "g": ["g", "gr", "gram", "grame", "grami"],
    "kg": ["kg", "kilogram", "kilograme", "kilo", "kile"],
    "ml": ["ml", "mililitri", "mililitru"],
    "l": ["l", "litru", "litri", "litre"],
    "linguriță": ["lingurita", "lingurite", "lingurițe", "lgt", "lgta", "ling"],
    "lingură": ["lingura", "linguri", "lg"],
    "cană": ["cana", "cani", "canuta", "canute"],
    "pahar": ["pahar", "pahare", "paharel", "paharele"],
    "praf": ["praf", "prafuri"],
    "vârf de cuțit": ["varf de cutit", "varfuri de cutit", "varf cutit"],
    "vârf de linguriță": ["varf de lingurita", "varf lingurita"],
    "bucată": ["bucata", "bucati", "buc", "bc"],
    "cățel": ["catel", "catei"],
    "felie": ["felie", "felii"],
    "legătură": ["legatura", "legaturi"],
    "plic": ["plic", "plicuri", "plicul"],
    "conservă": ["conserva", "conserve"],
}
# variantele cele mai lungi primele („linguri” nu trebuie să „mănânce” din „lingurite”)
_ALIASES = sorted(((a, unit) for unit, aliases in UNIT_ALIASES.items() for a in aliases), key=lambda x: -len(x[0]))
_UNSCALED_UNITS = {"praf", "vârf de cuțit", "vârf de linguriță"}  # „un praf” rămâne text, nu se scalează
# precizări după unitate: „1 linguriță cu vârf de boia”, „1 felie medie de țelină” → notă
_UNIT_DETAIL = re.compile(
    r"^(cu varf|varfuita|varfuite|rasa|rase|plina|pline|bune|buna|generoasa|generoase|mare|mari|medie|medii|mica|mici)\b\s*(?:de\s+)?",
)

_WORD_NUMBERS = {
    "un": 1, "o": 1, "una": 1, "unu": 1, "doi": 2, "doua": 2, "trei": 3, "patru": 4, "cinci": 5,
    "sase": 6, "sapte": 7, "opt": 8, "noua": 9, "zece": 10, "jumatate": 0.5, "jumatate de": 0.5,
}
_UNICODE_FRACTIONS = {"¼": " 1/4", "½": " 1/2", "¾": " 3/4", "⅓": " 1/3", "⅔": " 2/3", "⅛": " 1/8"}

_NUM = r"\d+(?:[.,]\d+)?"
_QTY = re.compile(
    rf"^(?P<whole>{_NUM})?\s*(?:(?:si|și)\s+)?(?P<frac>\d+\s*/\s*\d+)?"  # 500 | 1,5 | 1/2 | 1 1/2 | 1 și 1/2
    rf"(?:\s*(?:-|la|sau)\s*(?P<to>{_NUM}(?:\s*/\s*\d+)?))?"  # interval: 2-3, 2 la 3, 2 sau 3
    r"(?=\s|[a-zA-ZăâîșțĂÂÎȘȚ]|$)"
)
_APPROX = re.compile(r"^(aproximativ|aprox\.?|cca\.?|circa|vreo)\s+", re.IGNORECASE)
_TO_TASTE = re.compile(r"(?:,\s*|\s+)(?:dupa|după|la)\s+gust\s*$|^(?:dupa|după|la)\s+gust\s*$", re.IGNORECASE)
_OPTIONAL = re.compile(r"(?:,\s*|\s+)(?:optional|opțional)\s*$", re.IGNORECASE)
# după virgulă: mod de preparare / precizare → notă („ceapă, tocată”); altfel virgula leagă ingrediente („sare, piper”)
_NOTE_START = re.compile(
    r"^(tocat|ras|rase|feliat|taiat|curatat|zdrobit|fiert|copt|decojit|spalat|maruntit|topit|calit|"
    r"oparit|scurs|stors|batut|cernut|strecurat|macinat|presat|rumenit|uscat|congelat|decongelat|desfacut|"
    r"moale|rece|cald|caldut|la temperatura|proaspat|mic|mare|mediu|"
    r"in |cat |de preferat|pentru|cubulete|rondele|fasii|felii|julien|bucati|optional)"
)


def _number(text: str) -> float:
    text = text.replace(" ", "")
    if "/" in text:
        a, b = text.split("/")
        return int(a) / int(b) if int(b) else 0
    return float(text.replace(",", "."))


def _lower_first(text: str) -> str:
    """„Sare” → „sare”, dar „KitchenAid”/„Băneasa” cu majuscule în interior rămân."""
    if len(text) > 1 and text[0].isupper() and text[1:2].islower() and not re.search(r"[A-ZĂÂÎȘȚ]", text[1:]):
        return text[0].lower() + text[1:]
    return text


def _clean(text: str) -> str:
    text = fix_romanian(text) or ""
    for f, rep in _UNICODE_FRACTIONS.items():
        text = text.replace(f, rep)
    text = text.replace("–", "-").replace("—", "-").replace(" ", " ")
    text = re.sub(r"^\s*(?:[-•*·▪●]|\d+\s*[.)](?=\s+\D))\s*", "", text)  # buline / numerotare
    return " ".join(text.split()).strip(" .;")


def parse_ingredient(line: str) -> dict:
    result = {"quantity": None, "quantity_text": None, "unit": None, "name": "", "note": None}
    text = _clean(line)
    if not text:
        return result
    notes = []

    # paranteze → notă
    def _paren(m):
        notes.append(m.group(1).strip(" .,"))
        return " "
    text = " ".join(re.sub(r"\(([^)]*)\)", _paren, text).split())

    if _OPTIONAL.search(text):
        text = _OPTIONAL.sub("", text)
        notes.append("opțional")
    to_taste = bool(_TO_TASTE.search(text))
    text = _TO_TASTE.sub("", text).strip(" ,")

    if m := _APPROX.match(text):
        notes.append("aproximativ")
        text = text[m.end():]

    # cantitate: cifre („500”, „1,5”, „1 1/2”, „2-3”) sau cuvinte („un”, „o”, „două”, „jumătate de”)
    quantity = quantity_text = word_amount = None
    m = _QTY.match(text)
    if m and (m.group("whole") or m.group("frac")):
        if m.group("to"):
            quantity_text = re.sub(r"\s*(?:-|la|sau)\s*", "-", m.group(0).strip(), count=1)
        else:
            whole = _number(m.group("whole")) if m.group("whole") else 0
            quantity = whole + (_number(m.group("frac")) if m.group("frac") else 0)
        text = text[m.end():].strip()
    else:
        words = text.split(" ")
        for n in (2, 1):
            if len(words) > n and normalize(" ".join(words[:n])) in _WORD_NUMBERS:
                quantity = _WORD_NUMBERS[normalize(" ".join(words[:n]))]
                word_amount = " ".join(words[:n])
                text = " ".join(words[n:])
                break

    # unitate (doar după o cantitate, ca să nu confundăm „l” din „lapte”)
    unit = None
    if quantity is not None or quantity_text:
        norm = normalize(text)
        for alias, canonical in _ALIASES:
            if norm == alias or norm.startswith(alias + " ") or norm.startswith(alias + "."):
                unit = canonical
                text = text[len(alias):].lstrip(". ")
                break
        if unit and (m := _UNIT_DETAIL.match(normalize(text))):
            words = text.split()
            notes.insert(0, " ".join(words[: len(m.group(1).split())]).lower())
            text = " ".join(words[len(m.group(0).split()):])
        text = re.sub(r"^(de|din)\s+", "", text, flags=re.IGNORECASE)

    # „un praf de sare” → „un praf”, fără scalare
    if unit in _UNSCALED_UNITS:
        amount = (word_amount or "").lower() or quantity_text or f"{quantity:g}".replace(".", ",")
        quantity_text = f"{amount} {unit}"
        quantity, unit = None, None

    if to_taste and quantity is None and not quantity_text:
        unit = "la gust"

    # virgulă → notă, dacă urmează o precizare
    if "," in text:
        head, tail = text.split(",", 1)
        if _NOTE_START.match(normalize(tail.strip())):
            notes.insert(0, tail.strip())
            text = head

    name = _lower_first(text.strip(" ,"))
    if not name:  # nimic de numit: păstrăm rândul original
        return {**result, "name": _clean(line)}
    result.update(quantity=quantity, quantity_text=quantity_text, unit=unit, name=name[:200])
    notes = ["opțional" if normalize(n) == "optional" else n for n in notes]
    if notes:
        result["note"] = ", ".join(n for n in notes if n)[:200] or None
    return result
