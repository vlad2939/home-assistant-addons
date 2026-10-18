"""Sugestie de categorie pentru o rețetă importată, după cuvintele din titlu (utilizatorul o poate schimba)."""

import re
import sqlite3

from ..text import normalize

# ordinea contează: prima potrivire câștigă („salată de vinete” → Salate, „ardei la borcan” → Conserve)
RULES = [
    ("Conserve și murături", r"zacusca|dulceata|\bgem\b|murat|muraturi|la borcan|pentru iarna|compot|conserv"),
    ("Supe și ciorbe", r"ciorb|\bsup[ae]\b|supa de|bors"),
    ("Salate", r"salat"),
    ("Sosuri", r"^(sos|ketchup|maionez|mujdei|dressing|pesto)"),
    ("Băuturi", r"limonad|smoothie|cocktail|sirop|\bceai\b|vin fiert|socata|fresh"),
    ("Mic dejun", r"omlet|mic dejun|clatit|terci|granola|ochiuri"),
    ("Deserturi", r"\btort|prajitur|\bchec|briose|desert|papanas|cheesecake|inghetat|budinc|tiramisu|mousse|biscuit|negres|cornulet|gogos"),
    ("Panificație și patiserie", r"\bpaine|chifl|cozonac|placint|pizza|focaccia|foitaj|covrig|saratele|lipii|bagheta|pateu|strudel"),
    ("Garnituri", r"piure|garnitur|cartofi (la|prajiti|natur|rumeniti|taranesti)|orez cu legume"),
    ("Aperitive", r"aperitiv|tartin|rulouri|bruschet|humus|chiftelute"),
    ("Fel principal", r"tocan|friptur|snitel|sarmale|musaca|lasagna|\bpaste\b|risotto|kebab|chiftel|ostropel|cinteu|"
                      r"\bpui\b|porc|vita|\bpeste|ciulama|mancare|gulas|pilaf|ardei umpluti|tochitura|papricas|stufat"),
]


def guess_category(conn: sqlite3.Connection, title: str | None) -> int | None:
    text = normalize(title)
    if not text:
        return None
    categories = {normalize(r["name"]): r["id"] for r in conn.execute("SELECT id, name FROM categories")}
    for name, pattern in RULES:
        if re.search(pattern, text) and normalize(name) in categories:
            return categories[normalize(name)]
    return None
