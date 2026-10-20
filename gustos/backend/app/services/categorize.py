"""Sugestie de categorie pentru o rețetă importată, după cuvintele din titlu (utilizatorul o poate schimba).

Regulile acoperă titluri în română și în engleză (rețetele în engleză se traduc abia după import).
"""

import re
import sqlite3

from ..text import normalize

# ordinea contează: prima potrivire câștigă („salată de vinete” → Salate, „ardei la borcan” → Conserve)
RULES = [
    ("Conserve și murături", r"zacusca|dulceata|\bgem\b|murat|muraturi|la borcan|pentru iarna|compot|conserv"
                             r"|\bjam\b|marmalade|pickle|chutney|preserves"),
    ("Supe și ciorbe", r"ciorb|\bsup[ae]\b|supa de|bors|\bsoup|chowder|bisque|\bbroth\b"),
    ("Salate", r"salat|salad|\bslaw\b"),
    ("Sosuri", r"^(sos|ketchup|maionez|mujdei|dressing|pesto)|\bsauce\b|\bgravy\b|\bsalsa\b|\baioli\b"),
    ("Băuturi", r"limonad|smoothie|cocktail|sirop|\bceai\b|vin fiert|socata|fresh|lemonade|\btea\b|\bjuice\b|"
                r"milkshake|hot chocolate|\blatte\b|mulled wine"),
    ("Mic dejun", r"omlet|mic dejun|clatit|terci|granola|ochiuri|breakfast|pancake|waffle|porridge|oatmeal|french toast"),
    ("Deserturi", r"\btort|prajitur|\bchec|briose|desert|papanas|cheesecake|inghetat|budinc|tiramisu|mousse|biscuit|negres|"
                  r"cornulet|gogos|\bcakes?\b|\bcookies?\b|\bbrownies?\b|\btarts?\b|pudding|ice cream|\bmuffins?\b|"
                  r"\bcupcakes?\b|dessert|\bfudge\b|crumble|cobbler|\bdo(ugh)?nuts?\b|\bmacarons?\b|trifle|pavlova"),
    ("Panificație și patiserie", r"\bpaine|chifl|cozonac|placint|pizza|focaccia|foitaj|covrig|saratele|lipii|bagheta|pateu|"
                                 r"strudel|\bbread\b|\bbuns\b|\brolls\b|\bbagels?\b|\bscones?\b|pastry|\bcroissants?\b|"
                                 r"\bloaf\b|flatbread|\bpretzels?\b|brioche"),
    ("Garnituri", r"piure|garnitur|cartofi (la|prajiti|natur|rumeniti|taranesti)|orez cu legume|mashed potato|"
                  r"roast(ed)? potatoes|side dish|\bfries\b|coleslaw"),
    ("Aperitive", r"aperitiv|tartin|rulouri|bruschet|humus|chiftelute|appetizer|\bdip\b|hummus|guacamole|crostini|\bcanapes?\b"),
    ("Fel principal", r"tocan|friptur|snitel|sarmale|musaca|lasagna|\bpaste\b|risotto|kebab|chiftel|ostropel|cinteu|"
                      r"\bpui\b|porc|vita|\bpeste|ciulama|mancare|gulas|pilaf|ardei umpluti|tochitura|papricas|stufat|"
                      r"chicken|\bbeef\b|\bpork\b|\blamb\b|salmon|\bfish\b|shrimp|\bprawns?\b|pasta|spaghetti|curry|"
                      r"\bstew\b|chilli|chili|steak|\bmeatballs?\b|casserole|stir[- ]fry|\btacos?\b|\bburgers?\b|"
                      r"\broast\b|noodles|\benchiladas?\b|burrito|stroganoff"),
    # „pie” la final: „chicken pot pie” → Fel principal (mai sus), „apple pie” → Deserturi
    ("Deserturi", r"\bpie\b"),
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
