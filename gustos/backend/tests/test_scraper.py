"""Extragerea rețetelor, pe pagini de test care imită structura site-urilor reale."""

import json

from app.services.categorize import guess_category
from app.services.scraper import extract_recipe


def page(body: str, head: str = "", lang: str = "ro-RO") -> str:
    return f"<html lang='{lang}'><head>{head}</head><body><header><h1>Blog</h1></header>{body}<footer>© site</footer></body></html>"


def names(draft):
    return [i["name"] for i in draft["ingredients"]]


def test_wprm_plugin_with_groups():
    html = page("""
    <div class="wprm-recipe-container"><div class="wprm-recipe">
      <span class="wprm-recipe-servings">6</span>
      <div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">Pentru aluat</h4><ul>
        <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">500</span>
          <span class="wprm-recipe-ingredient-unit">g</span><span class="wprm-recipe-ingredient-name">făină</span></li>
        <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">1</span>
          <span class="wprm-recipe-ingredient-name">ceapă</span><span class="wprm-recipe-ingredient-notes">tocată</span></li>
      </ul></div>
      <div class="wprm-recipe-ingredient-group"><h4 class="wprm-recipe-group-name">Pentru sos</h4><ul>
        <li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">200</span>
          <span class="wprm-recipe-ingredient-unit">ml</span><span class="wprm-recipe-ingredient-name">smântână</span></li>
      </ul></div>
      <ul><li><div class="wprm-recipe-instruction-text">Se frământă aluatul bine.</div></li>
          <li><div class="wprm-recipe-instruction-text">Se coace 30 de minute.</div></li></ul>
      <div class="wprm-recipe-notes">Se servește caldă.</div>
    </div></div>""", head="<meta property='og:title' content='Plăcintă cu sos | Jamila Cuisine'><meta property='og:site_name' content='Jamila Cuisine'>")
    d = extract_recipe(html, "https://jamilacuisine.ro/placinta/")
    assert d["title"] == "Plăcintă cu sos"
    assert d["servings"] == 6
    assert [(i["group_name"], i["quantity"], i["unit"], i["name"], i["note"]) for i in d["ingredients"]] == [
        ("Pentru aluat", 500, "g", "făină", None),
        ("Pentru aluat", 1, None, "ceapă", "tocată"),
        ("Pentru sos", 200, "ml", "smântână", None),
    ]
    assert d["steps"] == ["Se frământă aluatul bine.", "Se coace 30 de minute."]
    assert d["tips"] == "Se servește caldă."
    assert d["source_site"] == "jamilacuisine.ro"
    assert d["original_language"] == "ro"


def test_schema_org_used_for_meta_and_page_for_steps():
    schema = {
        "@context": "https://schema.org", "@type": "Recipe", "name": "Tocăniță de porc",
        "recipeYield": "6 porții", "prepTime": "PT10M", "cookTime": "PT1H",
        "image": "https://savoriurbane.com/poza.jpg",
        "recipeIngredient": ["1 kg carne de porc", "2 cepe", "1 lingurita chimen"],
    }
    html = page(f"""
      <article><div class="entry-content">
        <p>O poveste lungă despre tocăniță, care nu face parte din rețetă și are mai multe propoziții.</p>
        <h2>Mod de preparare tocăniță</h2>
        <p>Se călește ceapa în untură până devine sticloasă.</p>
        <p>Se adaugă carnea și se fierbe la foc mic o oră.</p>
        <p>Poftă bună!</p>
        <h2>Valori nutriționale</h2><p>Calorii: 300 pe porție, foarte multe.</p>
      </div></article>""", head=f'<script type="application/ld+json">{json.dumps(schema)}</script>')
    d = extract_recipe(html, "https://savoriurbane.com/tocanita/")
    assert d["title"] == "Tocăniță de porc"
    assert (d["servings"], d["prep_time"], d["cook_time"]) == (6, 10, 60)
    assert names(d) == ["carne de porc", "cepe", "chimen"]
    assert d["steps"] == ["Se călește ceapa în untură până devine sticloasă.", "Se adaugă carnea și se fierbe la foc mic o oră."]
    assert d["image_url"] == "https://savoriurbane.com/poza.jpg"


def test_paragraph_label_then_list_then_paragraph_steps():
    """retetelemihaelei.com: „Ingrediente:” ca paragraf, listă, apoi pașii ca paragrafe, fără titlu."""
    html = page("""
      <h2 class="entry-title">Ardei copți la borcan</h2>
      <div class="entry-content">
        <p>Ingrediente:</p>
        <ul><li>2.5 kg de ardei copti</li><li>Sare</li><li>Aproximativ 200 ml otet</li></ul>
        <p>Ardeii i-am copt pe o tablă la foc mare, până s-a înnegrit pielița, apoi i-am curățat.</p>
        <p>Am pus ardeii în borcane și am turnat marinada fierbinte peste ei.</p>
        <p>Spor la conserve!</p>
      </div>""", head="<title>Ardei copți la borcan – Retetele Mihaelei</title>")
    d = extract_recipe(html, "https://retetelemihaelei.com/ardei/")
    assert d["title"] == "Ardei copți la borcan"
    assert [(i["quantity"], i["unit"], i["name"], i["note"]) for i in d["ingredients"]] == [
        (2.5, "kg", "ardei copti", None), (None, None, "sare", None), (200, "ml", "otet", "aproximativ")]
    assert len(d["steps"]) == 2
    assert d["image_url"] is None


def test_heading_groups_and_implicit_steps():
    """adihadean.ro: „Ingrediente”, grupuri „Pentru …”, apoi titluri de etape fără cuvântul „preparare”."""
    html = page("""
      <div class="entry-content">
        <p>Introducere lungă despre amintirile din copilărie și chifle, care nu e rețeta propriu-zisă.</p>
        <h1>Ingrediente</h1>
        <h2>Pentru aluatul chiflelor (aproximativ 12 bucăți)</h2>
        <ul><li>400 g făină semialbă</li><li>15 g drojdie</li></ul>
        <h2>Pentru sandvișuri (după preferință)</h2>
        <ul><li>unt</li><li>roșii, feliate</li></ul>
        <h2>Frământarea</h2>
        <p>Pun în bol făina, apa și drojdia și frământ 6 minute.</p>
        <h2>Coacerea</h2>
        <p>Coc chiflele la 190°C aproximativ 15 minute.</p>
        <p>Dragoș</p>
      </div>""")
    d = extract_recipe(html, "https://adihadean.ro/chifle/")
    assert [(i["group_name"], i["name"]) for i in d["ingredients"]] == [
        ("Pentru aluatul chiflelor", "făină semialbă"), ("Pentru aluatul chiflelor", "drojdie"),
        ("Pentru sandvișuri", "unt"), ("Pentru sandvișuri", "roșii")]
    assert d["steps"] == ["Pun în bol făina, apa și drojdia și frământ 6 minute.", "Coc chiflele la 190°C aproximativ 15 minute."]


def test_dash_headings_servings_and_numbered_steps():
    """teoskitchen.ro / lauraadamache.ro / sefpaulconstantin.ro: „Titlu – Ingrediente (2 porții)”, pași numerotați, sfaturi."""
    html = page("""
      <div class="entry-content">
        <h3>Paste alla Amatriciana – Ingrediente (2 porții)</h3>
        <ul><li>160 g paste</li><li>1–2 căței de usturoi, zdrobiți</li><li>sare, piper</li></ul>
        <h3>Paste alla Amatriciana – Mod de preparare</h3>
        <h4>Sosul</h4>
        <ul><li>01 - Rumenește guanciale-ul într-o tigaie rece.</li></ul>
        <h4>Prepararea pastelor</h4>
        <ul><li>02 - Fierbe pastele al dente, apoi mută-le în sos.</li></ul>
        <h3>Sfaturi alternative</h3>
        <ul><li>• Poți folosi pancetta în loc de guanciale.</li></ul>
        <h3>Întrebări frecvente</h3><p>Merge și cu bacon? Da, merge foarte bine.</p>
      </div>""", head="<meta property='og:title' content=\"Paste alla Amatriciana – Retete culinare by Teo's Kitchen\">")
    d = extract_recipe(html, "https://teoskitchen.ro/2026/01/paste.html")
    assert d["title"] == "Paste alla Amatriciana"
    assert d["servings"] == 2
    assert names(d) == ["paste", "usturoi", "sare, piper"]
    assert d["steps"] == ["Rumenește guanciale-ul într-o tigaie rece.", "Fierbe pastele al dente, apoi mută-le în sos."]
    assert d["tips"] == "Poți folosi pancetta în loc de guanciale."


def test_video_suffix_removed_from_title():
    for raw in ["Gogosi de dovlecei – Reteta Video", "Gogosi de dovlecei | Video", "Gogosi de dovlecei (video)"]:
        d = extract_recipe(page("", head=f"<meta property='og:title' content='{raw}'>"), "https://jamilacuisine.ro/g/")
        assert d["title"] == "Gogosi de dovlecei"


def test_ingredients_pentru_heading_becomes_group():
    html = page("""<div class="entry-content">
        <h2>Ingrediente pentru supa de oase</h2><ul><li>1 kg oase de vita</li></ul>
        <h2>Ingrediente pentru ciorba</h2><ul><li>2 morcovi</li></ul>
        <h2>Mod de preparare</h2><p>Fierbem oasele trei ore la foc mic.</p></div>""")
    d = extract_recipe(html, "https://www.lauraadamache.ro/ciorba.html")
    assert [i["group_name"] for i in d["ingredients"]] == ["Pentru supa de oase", "Pentru ciorba"]


def test_weak_intro_heading_replaced_by_real_steps():
    html = page("""<div class="entry-content">
        <h2>Cum se prepara ketchup de casa?</h2>
        <p>Soțul meu este mare amator de ketchup, așa că în fiecare toamnă pregătesc câteva sticle.</p>
        <h2>Ingrediente</h2><ul><li>500 g ceapa</li></ul>
        <h2>Mod de preparare ketchup</h2><p>Am călit ceapa în ulei până a devenit sticloasă.</p>
        <h2>Păstrare ketchup</h2><p>Am sterilizat sticlele și le-am umplut fierbinți.</p></div>""")
    d = extract_recipe(html, "https://savoriurbane.com/ketchup/")
    assert d["steps"] == ["Am călit ceapa în ulei până a devenit sticloasă."]


def test_nothing_found_gives_warnings():
    d = extract_recipe(page("<div class='entry-content'><p>Doar un articol oarecare.</p></div>"), "https://adihadean.ro/x/")
    assert d["ingredients"] == [] and d["steps"] == []
    assert len(d["warnings"]) == 2


def test_guess_category(conn):
    cat = {r["name"]: r["id"] for r in conn.execute("SELECT id, name FROM categories")}
    assert guess_category(conn, "Ciorbă de perișoare") == cat["Supe și ciorbe"]
    assert guess_category(conn, "Salata de vinete") == cat["Salate"]
    assert guess_category(conn, "Ardei capia copti la borcan") == cat["Conserve și murături"]
    assert guess_category(conn, "Chec cu albusuri si mere") == cat["Deserturi"]
    assert guess_category(conn, "Paine de casa rapida") == cat["Panificație și patiserie"]
    assert guess_category(conn, "Kebab la tava") == cat["Fel principal"]
    assert guess_category(conn, "Pui toscan in sos cremos") == cat["Fel principal"]
    assert guess_category(conn, "Sos de rosii pentru paste") == cat["Sosuri"]
    assert guess_category(conn, "Ceva necunoscut") is None


def test_tip_lines_moved_out_of_ingredients():
    html = page("""<div class="entry-content"><h3>Ingrediente</h3>
        <ul><li>1 kg cartofi</li><li>Sfat bonus: presară pătrunjel proaspăt la final</li></ul>
        <h3>Preparare</h3><ul><li>Fierbe cartofii în coajă până sunt moi.</li></ul></div>""")
    d = extract_recipe(html, "https://sefpaulconstantin.ro/cartofi/")
    assert names(d) == ["cartofi"]
    assert d["tips"] == "Sfat bonus: presară pătrunjel proaspăt la final"
