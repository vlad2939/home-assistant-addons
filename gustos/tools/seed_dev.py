"""Rețete de test pentru dezvoltare (doar în dev-data/, niciodată pe NUC).

Rulare din folderul proiectului:
    backend\\.venv\\Scripts\\python tools\\seed_dev.py            # 24 de rețete
    backend\\.venv\\Scripts\\python tools\\seed_dev.py --count 250  # pentru testul de viteză
Rețetele existente sunt șterse înainte (categoriile și setările rămân).
"""

import argparse
import os
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("GUSTOS_DATA_DIR", str(ROOT / "dev-data"))

from app import db  # noqa: E402
from app.schemas import RecipeIn  # noqa: E402
from app.services.recipes import create_recipe  # noqa: E402

# categorii: 1 Supe, 2 Fel principal, 3 Garnituri, 4 Salate, 5 Aperitive, 6 Deserturi,
# 7 Panificație, 8 Sosuri, 9 Conserve, 10 Mic dejun, 11 Băuturi


def ing(spec: str) -> dict:
    """„500|g|carne tocată|notă” sau „~un praf||sare” (~ = cantitate text)."""
    parts = (spec.split("|") + ["", "", "", ""])[:4]
    qty, unit, name, note = parts
    item = {"name": name, "unit": unit or None, "note": note or None}
    if qty.startswith("~"):
        item["quantity_text"] = qty[1:]
    elif qty:
        item["quantity"] = float(qty)
    return item


def group(name: str, *specs: str) -> list[dict]:
    return [{**ing(s), "group_name": name} for s in specs]


RECIPES = [
    dict(title="Ciorbă de perișoare", category_id=1, servings=6, prep_time=30, cook_time=60, difficulty="medie",
         description="Ciorbă acrișoară cu perișoare fragede de porc și legume.", tags=["tradițional", "iarnă"],
         ingredients=group("Pentru perișoare", "500|g|carne tocată de porc", "50|g|orez", "1|bucată|ou",
                           "~un praf||sare") + group("Pentru ciorbă", "1|bucată|ceapă", "2|bucată|morcov",
                                                     "1|bucată|ardei gras", "500|ml|borș", "~la gust||leuștean"),
         steps=["Se amestecă carnea cu orezul, oul și condimentele.", "Se fierb legumele 20 de minute.",
                "Se formează perișoarele și se adaugă în ciorbă.", "Se acrește cu borș și se presară leuștean."],
         tips="Perișoarele se formează cu mâinile ude.", source_url="https://www.jamilacuisine.ro/ciorba-de-perisoare/"),
    dict(title="Supă cu tăiței de casă", category_id=1, servings=4, prep_time=20, cook_time=50, difficulty="ușoară",
         description="Supă limpede de pui cu tăiței făcuți în casă.", tags=["rapid", "copii"],
         ingredients=[ing(s) for s in ["1|kg|pui", "2|bucată|morcov", "1|bucată|păstârnac", "1|bucată|ceapă",
                                       "200|g|tăiței de casă", "~la gust||pătrunjel"]],
         steps=["Se fierbe puiul cu legumele.", "Se strecoară supa.", "Se adaugă tăițeii și se fierb 5 minute."]),
    dict(title="Ciorbă rădăuțeană", category_id=1, servings=6, prep_time=20, cook_time=90, difficulty="medie",
         description="Ciorbă de pui cu smântână, usturoi și oțet.", tags=["tradițional"],
         ingredients=[ing(s) for s in ["1|kg|piept de pui", "200|g|smântână", "2|bucată|gălbenuș",
                                       "4|cățel|usturoi", "2|lingură|oțet", "2|bucată|morcov"]],
         steps=["Se fierbe puiul cu legumele.", "Se dresează cu smântână și gălbenușuri.",
                "Se adaugă usturoiul și oțetul."], source_url="https://savoriurbane.com/ciorba-radauteana/"),
    dict(title="Sarmale în foi de varză", category_id=2, servings=8, prep_time=60, cook_time=180,
         difficulty="dificilă", description="Sarmalele de duminică, cu afumătură.", tags=["tradițional", "iarnă", "sărbători"],
         ingredients=group("Pentru umplutură", "1|kg|carne tocată de porc", "150|g|orez", "2|bucată|ceapă",
                           "1|linguriță|cimbru") + group("Pentru fiert", "1|bucată|varză murată",
                                                         "300|g|afumătură", "400|ml|suc de roșii"),
         steps=["Se călește ceapa și se amestecă cu carnea și orezul.", "Se rulează sarmalele în foi de varză.",
                "Se așază în oală cu varză tocată și afumătură.", "Se fierb la foc mic 3 ore."],
         tips="Sunt mai bune a doua zi.", notes="Rețeta bunicii, cu mai mult cimbru.",
         source_url="https://www.retetelemihaelei.com/sarmale/"),
    dict(title="Tocăniță de pui cu ciuperci", category_id=2, servings=4, prep_time=15, cook_time=40, difficulty="ușoară",
         description="Tocăniță rapidă, cu sos cremos.", tags=["rapid"],
         ingredients=[ing(s) for s in ["800|g|pulpe de pui", "400|g|ciuperci", "1|bucată|ceapă", "2|lingură|pastă de roșii",
                                       "~la gust||boia dulce"]],
         steps=["Se rumenește puiul.", "Se adaugă ceapa și ciupercile.", "Se fierbe cu pasta de roșii 30 de minute."]),
    dict(title="Ardei umpluți", category_id=2, servings=6, prep_time=40, cook_time=70, difficulty="medie",
         tags=["vară"], ingredients=[ing(s) for s in ["8|bucată|ardei gras", "600|g|carne tocată", "100|g|orez",
                                                       "1|bucată|ceapă roșie", "500|ml|suc de roșii"]],
         steps=["Se curăță ardeii.", "Se umplu cu compoziția de carne.", "Se coc în sos de roșii."]),
    dict(title="Mușchi de porc la cuptor", category_id=2, servings=4, prep_time=15, cook_time=60, difficulty="medie",
         tags=["sărbători"], ingredients=[ing(s) for s in ["1|kg|mușchi de porc", "4|cățel|usturoi",
                                                            "2|lingură|muștar", "~un praf||piper"]],
         steps=["Se unge carnea cu muștar și usturoi.", "Se coace învelită în folie, apoi descoperită."],
         source_url="https://www.lauraadamache.ro/muschi-de-porc/"),
    dict(title="Piure de cartofi", category_id=3, servings=4, prep_time=10, cook_time=25, difficulty="ușoară",
         tags=["rapid", "copii"], ingredients=[ing(s) for s in ["1|kg|cartofi", "50|g|unt", "200|ml|lapte", "~un praf||sare"]],
         steps=["Se fierb cartofii.", "Se pasează cu unt și lapte cald."]),
    dict(title="Orez cu legume", category_id=3, servings=4, prep_time=10, cook_time=20,
         ingredients=[ing(s) for s in ["250|g|orez", "1|bucată|morcov", "100|g|mazăre", "1|bucată|ardei gras"]],
         steps=["Se călesc legumele.", "Se adaugă orezul și apa, se fierbe acoperit."]),
    dict(title="Salată de boeuf", category_id=4, servings=10, prep_time=90, cook_time=40, difficulty="medie",
         description="Salata de sărbători, cu maioneză de casă.", tags=["sărbători", "tradițional"],
         ingredients=[ing(s) for s in ["500|g|piept de pui", "6|bucată|cartofi", "4|bucată|morcov", "300|g|mazăre",
                                       "5|bucată|castraveți murați", "400|g|maioneză"]],
         steps=["Se fierb carnea și legumele.", "Se taie cubulețe.", "Se amestecă cu maioneza."],
         source_url="https://adihadean.ro/salata-de-boeuf/"),
    dict(title="Salată de vinete", category_id=4, servings=4, prep_time=20, cook_time=30,
         tags=["vară", "de post"], ingredients=[ing(s) for s in ["3|bucată|vinete", "1|bucată|ceapă", "100|ml|ulei",
                                                                  "~la gust||sare"]],
         steps=["Se coc vinetele pe plită.", "Se curăță și se toacă.", "Se freacă cu ulei și ceapă."]),
    dict(title="Salată orientală", category_id=4, servings=4, prep_time=20, cook_time=25, difficulty="ușoară",
         ingredients=[ing(s) for s in ["6|bucată|cartofi", "4|bucată|ou", "1|bucată|ceapă roșie", "100|g|măsline"]],
         steps=["Se fierb cartofii și ouăle.", "Se taie și se amestecă cu ceapa și măslinele."]),
    dict(title="Zacuscă de vinete", category_id=9, servings=20, prep_time=60, cook_time=180, difficulty="dificilă",
         tags=["toamnă", "de post"], ingredients=[ing(s) for s in ["3|kg|vinete", "3|kg|ardei kapia", "1|kg|ceapă",
                                                                    "500|ml|ulei", "500|ml|pastă de roșii"]],
         steps=["Se coc vinetele și ardeii.", "Se călește ceapa.", "Se fierb toate împreună.", "Se pune în borcane."],
         source_url="https://www.teoskitchen.ro/zacusca/"),
    dict(title="Castraveți murați", category_id=9, servings=10, prep_time=30,
         tags=["vară"], ingredients=[ing(s) for s in ["3|kg|castraveți", "1|legătură|mărar", "1|bucată|usturoi",
                                                       "~2-3|lingură|sare grunjoasă"]],
         steps=["Se spală castraveții.", "Se așază în borcan cu mărar și usturoi.", "Se acoperă cu saramură."]),
    dict(title="Papanași cu smântână și dulceață", category_id=6, servings=4, prep_time=20, cook_time=15,
         difficulty="medie", description="Desertul preferat, prăjit și pufos.", tags=["tradițional", "dulce"],
         ingredients=[ing(s) for s in ["500|g|brânză de vaci", "2|bucată|ou", "150|g|făină", "~un praf||sare",
                                       "200|g|smântână", "200|g|dulceață de afine"]],
         steps=["Se amestecă brânza cu ouăle și făina.", "Se formează papanașii.", "Se prăjesc în ulei încins."],
         source_url="https://www.jamilacuisine.ro/papanasi/"),
    dict(title="Cozonac cu nucă", category_id=7, servings=16, prep_time=180, cook_time=50, difficulty="dificilă",
         tags=["sărbători", "dulce", "tradițional"],
         ingredients=group("Aluat", "1|kg|făină", "25|g|drojdie", "300|ml|lapte", "200|g|zahăr", "6|bucată|gălbenuș",
                           "150|g|unt") + group("Umplutură", "400|g|nucă măcinată", "150|g|zahăr", "2|lingură|cacao"),
         steps=["Se face maiaua.", "Se frământă aluatul și se lasă la dospit.", "Se umple cu nucă și se împletește.",
                "Se coace 50 de minute."], tips="Toate ingredientele la temperatura camerei.",
         source_url="https://sefpaulconstantin.ro/cozonac/"),
    dict(title="Pâine de casă", category_id=7, servings=8, prep_time=120, cook_time=40, difficulty="medie",
         ingredients=[ing(s) for s in ["500|g|făină", "7|g|drojdie uscată", "350|ml|apă", "10|g|sare"]],
         steps=["Se frământă aluatul.", "Se lasă la crescut 1 oră.", "Se coace în tavă fierbinte."]),
    dict(title="Clătite", category_id=6, servings=4, prep_time=10, cook_time=20, difficulty="ușoară",
         tags=["rapid", "copii", "dulce"], ingredients=[ing(s) for s in ["2|bucată|ou", "250|g|făină", "500|ml|lapte",
                                                                          "1|lingură|zahăr"]],
         steps=["Se amestecă totul într-un aluat fluid.", "Se coc în tigaie unsă."]),
    dict(title="Prăjitură cu mere", category_id=6, servings=12, prep_time=30, cook_time=40,
         tags=["toamnă", "dulce"], ingredients=[ing(s) for s in ["1|kg|mere", "300|g|făină", "200|g|unt", "150|g|zahăr",
                                                                  "1|linguriță|scorțișoară"]],
         steps=["Se face aluatul fraged.", "Se rad merele și se călesc cu scorțișoară.", "Se coace 40 de minute."]),
    dict(title="Mujdei de usturoi", category_id=8, servings=4, prep_time=10,
         tags=["rapid"], ingredients=[ing(s) for s in ["1|bucată|usturoi", "100|ml|apă", "~un praf||sare", "2|lingură|ulei"]],
         steps=["Se pisează usturoiul cu sare.", "Se adaugă apă și ulei."]),
    dict(title="Omletă cu legume", category_id=10, servings=2, prep_time=5, cook_time=10, difficulty="ușoară",
         tags=["rapid"], ingredients=[ing(s) for s in ["4|bucată|ou", "1|bucată|ardei gras", "1|bucată|roșie",
                                                        "50|g|telemea"]],
         steps=["Se călesc legumele.", "Se adaugă ouăle bătute și brânza."]),
    dict(title="Mămăligă cu brânză și smântână", category_id=10, servings=4, prep_time=5, cook_time=25,
         tags=["tradițional"], ingredients=[ing(s) for s in ["250|g|mălai", "1|l|apă", "200|g|brânză de burduf",
                                                              "200|g|smântână"]],
         steps=["Se fierbe mălaiul în apă cu sare.", "Se servește cu brânză și smântână."]),
    dict(title="Limonadă cu mentă", category_id=11, servings=6, prep_time=10,
         tags=["vară", "rapid"], ingredients=[ing(s) for s in ["4|bucată|lămâi", "1|l|apă minerală", "~la gust||miere",
                                                                "~o mână||mentă"]],
         steps=["Se stoarce zeama de lămâie.", "Se amestecă cu apă, miere și mentă."]),
    dict(title="Vin fiert", category_id=11, servings=4, cook_time=15,
         tags=["iarnă"], ingredients=[ing(s) for s in ["1|l|vin roșu", "2|bucată|baton de scorțișoară",
                                                        "1|bucată|portocală", "100|g|zahăr"]],
         steps=["Se încălzește vinul cu condimentele fără să fiarbă."]),
]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=len(RECIPES))
    args = parser.parse_args()

    conn = db.connect()
    db.migrate(conn)
    with conn:
        conn.execute("DELETE FROM recipes")
        conn.execute("DELETE FROM recipes_fts")
        conn.execute("DELETE FROM tags")

    rng = random.Random(39)
    for i in range(args.count):
        base = dict(RECIPES[i % len(RECIPES)])
        if i >= len(RECIPES):
            base["title"] = f"{base['title']} (varianta {i // len(RECIPES) + 1})"
        recipe_id = create_recipe(conn, RecipeIn(**base))
        if rng.random() < 0.25:
            conn.execute("UPDATE recipes SET favorite = 1 WHERE id = ?", (recipe_id,))
        # date de creare diferite, ca sortarea „recente” să fie realistă
        conn.execute(
            "UPDATE recipes SET created_at = datetime('now', ?), updated_at = datetime('now', ?) WHERE id = ?",
            (f"-{args.count - i} hours", f"-{args.count - i} hours", recipe_id),
        )
    conn.commit()
    print(f"Am creat {args.count} rețete de test în {db.db_path()}")
    conn.close()


if __name__ == "__main__":
    main()
