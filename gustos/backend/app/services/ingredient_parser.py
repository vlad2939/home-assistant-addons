"""Descompunerea unui rând de ingredient în română: cantitate, unitate, denumire, notă.

Exemple:
    „500 g făină albă”                 → 500, g, „făină albă”
    „1–2 căței de usturoi, zdrobiți”   → „1-2” (text), cățel, „usturoi”, notă „zdrobiți”
    „un praf de sare”                  → „un praf” (text), –, „sare”
    „sare, piper, după gust”           → –, la gust, „sare, piper”
Dacă rândul nu poate fi înțeles, rămâne întreg în denumire, pentru corectare manuală.
Funcționează și pe texte scrise fără diacritice („lingurita”, „catei”).

Pentru rețetele în engleză (lang="en") se recunosc și unitățile americane / britanice, care devin
unitățile românești: „2 cups flour” → 2 cană, „8 oz cheese” → 225 g, „a pinch of salt” → „un praf”.
Denumirea și nota rămân în engleză (se traduc separat, din previzualizare).
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

# Rețete în engleză: unitate → (unitatea românească, factor de conversie)
EN_UNITS = {
    ("cană", 1): ["cup", "cups"],
    ("lingură", 1): ["tablespoon", "tablespoons", "tbsp", "tbsps", "tbs", "tbl", "tblsp"],
    ("linguriță", 1): ["teaspoon", "teaspoons", "tsp", "tsps"],
    ("ml", 29.57): ["fl oz", "fl. oz", "fluid ounce", "fluid ounces"],
    ("g", 28.35): ["ounce", "ounces", "oz"],
    ("g", 453.6): ["pound", "pounds", "lb", "lbs"],
    ("ml", 473): ["pint", "pints"],
    ("ml", 946): ["quart", "quarts", "qt"],
    ("g", 113): ["stick", "sticks"],  # de unt
    ("g", 1): ["gram", "grams", "g", "gr"],
    ("kg", 1): ["kilogram", "kilograms", "kg"],
    ("ml", 1): ["milliliter", "milliliters", "millilitre", "millilitres", "ml"],
    ("l", 1): ["liter", "liters", "litre", "litres", "l"],
    ("praf", 1): ["pinch", "pinches", "dash", "dashes"],
    ("cățel", 1): ["clove", "cloves"],
    ("felie", 1): ["slice", "slices"],
    ("legătură", 1): ["bunch", "bunches"],
    ("plic", 1): ["packet", "packets", "sachet", "sachets", "envelope", "envelopes"],
    ("conservă", 1): ["can", "cans", "tin", "tins"],
    ("bucată", 1): ["piece", "pieces"],
}
_EN_ALIASES = sorted(
    ((a, unit, factor) for (unit, factor), aliases in EN_UNITS.items() for a in aliases), key=lambda x: -len(x[0])
)
_EN_WORD_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "twelve": 12, "half": 0.5, "half a": 0.5, "a dozen": 12, "dozen": 12,
}
_EN_UNIT_DETAIL = re.compile(r"^(heaped|heaping|level|rounded|scant|generous|large|medium|small|big)\b\s*")
_EN_NOTE_START = re.compile(
    r"^(chopped|finely|roughly|coarsely|thinly|diced|sliced|minced|grated|shredded|crushed|peeled|halved|quartered|"
    r"cubed|softened|melted|beaten|whisked|sifted|drained|rinsed|trimmed|seeded|deseeded|cored|toasted|cooked|"
    r"cut|torn|zested|juiced|divided|plus|at room|room temperature|cold|warm|hot|fresh|frozen|thawed|"
    r"to serve|for |about|approximately|or |such as|optional)"
)
_EN_TO_TASTE = re.compile(r"(?:,\s*|\s+)(?:to\s+taste|as\s+needed)\s*$|^(?:to\s+taste)\s*$", re.IGNORECASE)
_EN_APPROX = re.compile(r"^(about|approximately|approx\.?|around|roughly)\s+", re.IGNORECASE)

_WORD_NUMBERS = {
    "un": 1, "o": 1, "una": 1, "unu": 1, "doi": 2, "doua": 2, "trei": 3, "patru": 4, "cinci": 5,
    "sase": 6, "sapte": 7, "opt": 8, "noua": 9, "zece": 10, "jumatate": 0.5, "jumatate de": 0.5,
}
_UNICODE_FRACTIONS = {"¼": " 1/4", "½": " 1/2", "¾": " 3/4", "⅓": " 1/3", "⅔": " 2/3", "⅛": " 1/8"}

_NUM = r"\d+(?:[.,]\d+)?"
_QTY = re.compile(
    rf"^(?P<whole>{_NUM})?\s*(?:(?:si|și)\s+)?(?P<frac>\d+\s*/\s*\d+)?"  # 500 | 1,5 | 1/2 | 1 1/2 | 1 și 1/2
    rf"(?:\s*(?:-|la|sau|to|or)\s*(?P<to>{_NUM}(?:\s*/\s*\d+)?))?"  # interval: 2-3, 2 la 3, 2 sau 3, 2 to 3
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


def _convert(value: float, factor: float) -> float:
    """Uncii / livre → grame: rotunjit la 5 g (sau la 1 g pentru cantități mici)."""
    if factor == 1:
        return value
    value *= factor
    return round(value / 5) * 5 if value >= 20 else round(value)


def _convert_range(text: str, factor: float) -> str:
    if factor == 1:
        return text
    return "-".join(f"{_convert(_number(part), factor):g}" for part in text.split("-"))


def parse_ingredient(line: str, lang: str = "ro") -> dict:
    english = lang == "en"
    result = {"quantity": None, "quantity_text": None, "unit": None, "name": "", "note": None}
    text = _clean(line)
    if not text:
        return result
    notes = []

    # paranteze → notă
    def _paren(m):
        note = m.group(1).strip(" .,")
        # „(Note 1)” trimite la notele de pe site, care nu se importă
        note = re.sub(r"(?:,\s*)?\b(?:see\s+)?notes?\s*\d*\s*$", "", note, flags=re.IGNORECASE).strip(" .,") if english else note
        if note:
            notes.append(note)
        return " "
    text = " ".join(re.sub(r"\(([^)]*)\)", _paren, text).split())

    if _OPTIONAL.search(text):
        text = _OPTIONAL.sub("", text)
        notes.append("opțional")
    taste = _EN_TO_TASTE if english else _TO_TASTE
    to_taste = bool(taste.search(text))
    text = taste.sub("", text).strip(" ,")

    if m := (_EN_APPROX if english else _APPROX).match(text):
        notes.append("aproximativ")
        text = text[m.end():]

    # cantitate: cifre („500”, „1,5”, „1 1/2”, „2-3”) sau cuvinte („un”, „o”, „două”, „jumătate de”)
    quantity = quantity_text = word_amount = None
    m = _QTY.match(text)
    if m and (m.group("whole") or m.group("frac")):
        if m.group("to"):
            quantity_text = re.sub(r"\s*(?:-|la|sau|to|or)\s*", "-", m.group(0).strip(), count=1)
        else:
            whole = _number(m.group("whole")) if m.group("whole") else 0
            quantity = whole + (_number(m.group("frac")) if m.group("frac") else 0)
        text = text[m.end():].strip()
    else:
        words = text.split(" ")
        numbers = _EN_WORD_NUMBERS if english else _WORD_NUMBERS
        for n in (2, 1):
            if len(words) > n and normalize(" ".join(words[:n])) in numbers:
                quantity = numbers[normalize(" ".join(words[:n]))]
                word_amount = " ".join(words[:n])
                text = " ".join(words[n:])
                break

    # unitate (doar după o cantitate, ca să nu confundăm „l” din „lapte”)
    unit = None
    if (quantity is not None or quantity_text) and english:
        # „1 heaped tsp” / „2 large cloves”: precizarea dinaintea unității → notă
        if (m := _EN_UNIT_DETAIL.match(normalize(text))) and any(
            normalize(text[m.end():]).startswith(a + " ") for a, _, _ in _EN_ALIASES
        ):
            notes.append(text[: len(m.group(1))].lower())
            text = text[m.end():]
        norm = normalize(text)
        for alias, canonical, factor in _EN_ALIASES:
            if norm == alias or norm.startswith(alias + " ") or norm.startswith(alias + "."):
                unit = canonical
                text = text[len(alias):].lstrip(". ")
                if quantity is not None:
                    quantity = _convert(quantity, factor)
                elif quantity_text:
                    quantity_text = _convert_range(quantity_text, factor)
                break
        if unit and (m := _EN_UNIT_DETAIL.match(normalize(text))):
            notes.insert(0, text[: len(m.group(1))].lower())
            text = text[m.end():]
        # „30g / 2 tbsp butter”: cantitatea în celălalt sistem de măsură se renunță
        if (m := re.match(r"^/\s*\d[\d.,/ ]*\s*([a-z][a-z. ]*?)\s+", normalize(text))) and any(
            m.group(1).strip(". ") == a for a, _, _ in _EN_ALIASES
        ):
            text = text[m.end():]
        text = re.sub(r"^of\s+", "", text, flags=re.IGNORECASE)
        word_amount = "un" if quantity == 1 else None
    elif quantity is not None or quantity_text:
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
        if (_EN_NOTE_START if english else _NOTE_START).match(normalize(tail.strip())):
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
