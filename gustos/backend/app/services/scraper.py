"""Extragerea unei rețete dintr-o pagină web.

Site-urile românești publică rețetele în moduri foarte diferite, așa că se combină trei surse:
  1. pluginurile WordPress de rețete (WP Recipe Maker, Tasty Recipes) – date structurate, cu grupuri;
  2. datele schema.org/Recipe (prin biblioteca recipe-scrapers) – titlu, timpi, porții, poză;
  3. citirea paginii după titluri („Ingrediente”, „Pentru aluat”, „Mod de preparare”, „Sfaturi”).
Pentru fiecare câmp se alege cea mai bună sursă disponibilă. Rezultatul este o ciornă, corectată de
utilizator în previzualizare.
"""

import re
import warnings
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from ..text import fix_romanian, normalize
from .ingredient_parser import parse_ingredient
from .recipes import site_from_url

HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"]
NOISE = "script, style, noscript, nav, header, footer, aside, form, iframe, svg, .comments, #comments, .sharedaddy, .related, .jp-relatedposts, .wp-block-buttons"

_KIND_PATTERNS = [
    ("ingredients", re.compile(r"(^|[-–|:]\s*)(ingrediente|ingredientele|ingredient|lista de ingrediente|ce ai nevoie|de ce ai nevoie|necesar)")),
    ("stop", re.compile(r"(valori nutritionale|intrebari frecvente|faq|alte retete|retete similare|vezi si|comentari|ti-ar putea placea|s-ar putea sa-ti placa|abonea)")),
    ("tips", re.compile(r"^(sfat|sfaturi|secret|trucuri|observati|nota|note|recomandari|idei de servire|servire|variatii|variante)")),
    ("steps", re.compile(r"(mod de preparare|^preparare|preparare:|[-–]\s*preparare|instructiuni|^pasi|pasii|metoda de|^procedura)")),
    # titluri „slabe”: pot fi doar introducere („Cum se prepara ketchup de casa?”)
    ("weak_steps", re.compile(r"(^pregatire|pregatirea|cum se (prepara|face|gateste))")),
]
_SALUTATION = re.compile(r"(pofta buna|s-aveti pofta|numai bine|spor la|enjoy|va pup|cu drag|alte idei|aici\.?$|reteta video|urmariti|abonati)")
_STEP_NUMBER = re.compile(r"^\s*(?:pasul\s*)?\d{1,2}\s*[.):\-–]\s*|^\s*[•▪●*-]\s*", re.IGNORECASE)
_SERVINGS = re.compile(r"(\d{1,3})\s*(?:de\s+)?(?:portii|porții|porţii|persoane|bucati|bucăți)", re.IGNORECASE)
_SERVINGS_LABEL = re.compile(r"porti[ie]\s*:?\s*(\d{1,3})", re.IGNORECASE)
_TIP_LINE = re.compile(r"^(sfat|nota|observatie|atentie|important|tip|truc)\b[^:]{0,20}:")
_TITLE_SUFFIX = re.compile(r"\s*([|\-–]\s*(re[tț]et[aă]\s+)?video|\(video\))\s*$", re.IGNORECASE)


def _text(el) -> str:
    return " ".join(el.get_text(" ", strip=True).split()) if el else ""


def _classify(heading: str) -> str | None:
    norm = normalize(heading).strip(" :")
    for kind, pattern in _KIND_PATTERNS:
        if pattern.search(norm):
            return kind
    return None


def _clean_step(text: str) -> str | None:
    text = fix_romanian(_STEP_NUMBER.sub("", text)).strip()
    norm = normalize(text)
    if len(text.split()) < 3 or (len(text) < 70 and _SALUTATION.search(norm)):
        return None
    return text


def _lines(el: Tag) -> list[str]:
    """Un paragraf cu <br> conține de obicei mai multe ingrediente, câte unul pe rând."""
    for br in el.find_all("br"):
        br.replace_with("\n")
    return [" ".join(line.split()) for line in el.get_text().split("\n") if line.strip()]


def _group_from_heading(heading: str) -> str | None:
    """„Ingrediente pentru supa de oase” → „Pentru supa de oase”; „Pentru aluat:” → „Pentru aluat”."""
    text = fix_romanian(heading).strip(" :")
    m = re.search(r"\b(pentru\s+.+)$", text, re.IGNORECASE)
    if m:
        group = re.sub(r"\s*\(.*?\)?\s*$", "", m.group(1)).strip(" )")  # „(aproximativ 12 bucăți)”
        if re.match(r"^pentru\s+(\d+|o|un|una|doua|două)(\s+\S+)?$", normalize(group)):
            return None  # „pentru 6 persoane”, „pentru o pâine”
        return group[0].upper() + group[1:]
    return None


# ---------- 1. pluginuri WordPress ----------

def _from_wprm(soup: BeautifulSoup) -> dict | None:
    box = soup.select_one(".wprm-recipe-container, .wprm-recipe")
    if not box or not box.select(".wprm-recipe-ingredient"):
        return None
    groups = []
    for g in box.select(".wprm-recipe-ingredient-group"):
        name = _text(g.select_one(".wprm-recipe-group-name")) or None
        lines = []
        for li in g.select(".wprm-recipe-ingredient"):
            parts = [_text(li.select_one(f".wprm-recipe-ingredient-{c}")) for c in ("amount", "unit", "name")]
            line = " ".join(p for p in parts if p)
            notes = _text(li.select_one(".wprm-recipe-ingredient-notes"))
            lines.append(f"{line} ({notes})" if notes else line)
        groups.append((name, lines))
    steps = [_text(s) for s in box.select(".wprm-recipe-instruction-text")]
    servings = _text(box.select_one(".wprm-recipe-servings"))
    return {
        "groups": groups,
        "steps": steps,
        "tips": "\n".join(_text(n) for n in box.select(".wprm-recipe-notes")) or None,
        "servings": int(servings) if servings.isdigit() else None,
    }


def _from_tasty(soup: BeautifulSoup) -> dict | None:
    box = soup.select_one(".tasty-recipes")
    if not box:
        return None
    groups, current = [], (None, [])
    ingredients = box.select_one(".tasty-recipes-ingredients")
    if ingredients:
        for el in ingredients.find_all(["h3", "h4", "p", "li"]):
            if el.name in ("h3", "h4") or (el.name == "p" and _text(el).endswith(":")):
                if current[1]:
                    groups.append(current)
                current = (_text(el).strip(" :"), [])
            elif el.name == "li":
                current[1].append(_text(el))
    if current[1]:
        groups.append(current)
    steps = [_text(li) for li in box.select(".tasty-recipes-instructions li")]
    if not groups and not steps:
        return None
    return {"groups": groups, "steps": steps, "tips": _text(box.select_one(".tasty-recipes-notes")) or None, "servings": None}


# ---------- 2. schema.org ----------

def _from_schema(html: str, url: str) -> dict:
    try:
        from recipe_scrapers import scrape_html

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            s = scrape_html(html, org_url=url, supported_only=False)
    except Exception:  # pagina nu are date schema.org Recipe
        return {}

    def get(method):
        try:
            value = getattr(s, method)()
            return value or None
        except Exception:
            return None

    result = {
        "title": get("title"),
        "description": get("description"),
        "prep_time": get("prep_time"),
        "cook_time": get("cook_time"),
        "total_time": get("total_time"),
        "image": get("image"),
        "language": get("language"),
        "steps": get("instructions_list") or [],
    }
    yields = get("yields")
    if yields and (m := re.search(r"\d+", str(yields))):
        result["servings"] = int(m.group())
    ingredients = get("ingredients") or []
    # o singură linie foarte lungă = ingrediente lipite, inutilizabile
    if len(ingredients) > 1 or (ingredients and len(ingredients[0]) < 120):
        groups = get("ingredient_groups") or []
        if len(groups) > 1:
            result["groups"] = [(g.purpose, list(g.ingredients)) for g in groups]
        else:
            result["groups"] = [(None, ingredients)]
    return result


# ---------- 3. citirea paginii după titluri ----------

def _content_root(soup: BeautifulSoup) -> Tag:
    candidates = [
        soup.select_one(sel)
        for sel in (".entry-content", ".post-content", ".elementor-widget-theme-post-content", ".td-post-content",
                    ".single-content", "article", "main")
    ]
    for c in candidates:
        if c and any(_classify(_text(h)) == "ingredients" for h in c.find_all(HEADINGS + ["p", "strong"])):
            return c
    return soup.body or soup


def _is_label(el: Tag) -> bool:
    """Paragraf scurt folosit ca titlu: „Ingrediente:”, „Pentru sos:” sau text complet îngroșat."""
    if el.name != "p":
        return False
    text = _text(el)
    if not text or len(text) > 70:
        return False
    bold = _text(el.find(["strong", "b"]))
    return text.endswith(":") or (bold and len(bold) >= len(text) - 1)


def _from_headings(soup: BeautifulSoup) -> dict:
    root = _content_root(soup)
    groups: list[tuple[str | None, list[str]]] = []
    steps: list[str] = []
    tips: list[str] = []
    servings = None
    section, start_level = None, 0
    weak_steps = False

    def add_group(name):
        if groups and not groups[-1][1]:
            groups[-1] = (name, [])
        else:
            groups.append((name, []))

    def ingredient_count():
        return sum(len(g[1]) for g in groups)

    for el in root.find_all(HEADINGS + ["p", "li"]):
        if el.find_parent(["li", "p"]) is not None:
            continue  # conținut deja citit prin elementul părinte
        text = _text(el)
        if not text:
            continue

        if el.name in HEADINGS or _is_label(el):
            if len(text) > 120:
                continue
            level = int(el.name[1]) if el.name in HEADINGS else 7
            kind = _classify(text)
            if kind == "ingredients":
                section, start_level = "ingredients", level
                add_group(_group_from_heading(text))
                if not servings and (m := _SERVINGS.search(text)):
                    servings = int(m.group(1))
            elif kind in ("steps", "weak_steps") and not (section == "ingredients" and _group_from_heading(text)):
                if kind == "steps" and weak_steps:
                    steps.clear()  # ce era sub „Cum se prepară…?” a fost doar introducere
                weak_steps = kind == "weak_steps" and section != "ingredients" and not ingredient_count()
                # subtitlurile din pași („Prepararea aluatului”) nu schimbă nivelul secțiunii
                keep = section in ("ingredients", "steps")
                section, start_level = "steps", min(level, start_level) if keep else level
            elif kind == "tips":
                section, start_level = "tips", level
            elif kind == "stop":
                section = None
            elif section == "ingredients":
                group = _group_from_heading(text)
                if group or not ingredient_count():
                    add_group(group or fix_romanian(text).strip(" :"))
                else:  # titlu oarecare după ingrediente: începe prepararea („Frământarea”, „Coacerea”)
                    section = "steps"
            elif section in ("steps", "tips") and level <= start_level:
                section = None
            continue

        if section == "ingredients":
            if el.name == "li":
                groups[-1][1].append(text)
            elif len(text) <= 120 and not text.endswith("."):
                groups[-1][1].extend(_lines(el))
            elif ingredient_count():  # paragraf lung după listă: pașii, fără titlu separat
                section = "steps"
                if step := _clean_step(text):
                    steps.append(step)
        elif section == "steps":
            if step := _clean_step(text):
                steps.append(step)
        elif section == "tips":
            if tip := _clean_step(text):
                tips.append(tip)

        if not servings and (m := _SERVINGS_LABEL.search(text)) and len(text) < 200:
            servings = int(m.group(1))

    groups = [(name, lines) for name, lines in groups if lines]
    return {"groups": groups, "steps": steps, "tips": "\n".join(tips) or None, "servings": servings}


# ---------- combinarea ----------

def _meta(soup: BeautifulSoup, prop: str) -> str | None:
    tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
    return (tag.get("content") or "").strip() or None if tag else None


def _first_content_image(soup: BeautifulSoup) -> str | None:
    root = soup.select_one(".entry-content, article, main") or soup
    for img in root.find_all("img"):
        src = img.get("data-src") or img.get("data-lazy-src") or img.get("src") or ""
        if src.startswith(("http", "/")) and not src.endswith((".svg", ".gif")) and "logo" not in src.lower():
            return src
    return None


def _clean_title(title: str | None, site_name: str | None, url: str) -> str | None:
    """Fără „– Retetele Mihaelei” / „| Jamila Cuisine” / „| Video” la final."""
    if not title:
        return None
    title = fix_romanian(title)
    def squash(text):
        return re.sub(r"[^a-z0-9]", "", normalize(text))

    domain = squash(site_from_url(url).split(".")[0])
    parts = re.split(r"\s+[|–-]\s+", title)
    while len(parts) > 1:
        last = squash(parts[-1])
        if (site_name and last == squash(site_name)) or (last and (last in domain or domain in last)):
            parts.pop()
        else:
            break
    return _TITLE_SUFFIX.sub("", " – ".join(parts)).strip() or None


def _count(groups) -> int:
    return sum(len(lines) for _, lines in groups or [])


def extract_recipe(html: str, url: str) -> dict:
    """HTML → ciornă de rețetă (același format ca la salvare), plus image_url și warnings."""
    schema = _from_schema(html, url)
    soup = BeautifulSoup(html, "lxml")
    # titlul, poza și descrierea se citesc înainte de a elimina antetul paginii
    site_name = _meta(soup, "og:site_name")
    page_title = _meta(soup, "og:title") or _text(soup.select_one(".entry-title")) or _text(soup.find("title")) or _text(soup.find("h1"))
    og_image = _meta(soup, "og:image") or _first_content_image(soup)
    meta_description = _meta(soup, "og:description") or _meta(soup, "description")
    language = (schema.get("language") or (soup.html.get("lang") if soup.html else "") or "").split("-")[0].lower() or None
    for el in soup.select(NOISE):
        el.decompose()
    plugin = _from_wprm(soup) or _from_tasty(soup)
    page = _from_headings(soup)

    if plugin and _count(plugin["groups"]):
        groups = plugin["groups"]
    elif schema.get("groups") and not (len(page["groups"]) > 1 and _count(page["groups"]) >= 0.8 * _count(schema["groups"])):
        groups = schema["groups"]
    else:
        groups = page["groups"]

    steps = (plugin or {}).get("steps") or schema.get("steps") or page["steps"]
    ingredient_lines = {normalize(line) for _, lines in groups for line in lines}
    steps = [s for s in (_clean_step(x) for x in steps) if s and normalize(s) not in ingredient_lines]

    # „Sfat bonus: …” / „Notă: …” ajunse printre ingrediente → la sfaturi
    tips = (plugin or {}).get("tips") or page["tips"]
    extra_tips = []
    for _, lines in groups:
        for line in list(lines):
            if _TIP_LINE.match(normalize(line)):
                lines.remove(line)
                extra_tips.append(fix_romanian(line))
    if extra_tips:
        tips = "\n".join(filter(None, [tips, *extra_tips]))

    ingredients = []
    for group_name, lines in groups:
        for line in lines:
            parsed = parse_ingredient(line)
            if parsed["name"]:
                ingredients.append({"group_name": fix_romanian(group_name) if group_name else None, **parsed})

    title = _clean_title(schema.get("title") or page_title, site_name, url)
    description = fix_romanian(schema.get("description") or meta_description)
    if description and (len(description) > 1000 or description == title):
        description = description[:1000] if description != title else None

    image = schema.get("image") or og_image

    warnings_ = []
    if not ingredients:
        warnings_.append("Nu am găsit ingredientele. Completează-le manual.")
    if not steps:
        warnings_.append("Nu am găsit modul de preparare. Completează-l manual.")

    return {
        "title": title or "Rețetă importată",
        "description": description,
        "servings": (plugin or {}).get("servings") or schema.get("servings") or page["servings"],
        "prep_time": schema.get("prep_time"),
        "cook_time": schema.get("cook_time"),
        "ingredients": ingredients,
        "steps": steps,
        "tips": tips,
        "source_url": url,
        "source_site": site_from_url(url),
        "original_language": language,
        "image_url": urljoin(url, image) if image else None,
        "warnings": warnings_,
    }
