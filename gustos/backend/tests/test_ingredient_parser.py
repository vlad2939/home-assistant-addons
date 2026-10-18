import pytest

from app.services.ingredient_parser import parse_ingredient


def p(line):
    r = parse_ingredient(line)
    return (r["quantity"], r["quantity_text"], r["unit"], r["name"], r["note"])


@pytest.mark.parametrize(
    "line, expected",
    [
        ("500 g făină albă", (500, None, "g", "făină albă", None)),
        ("500g zahăr", (500, None, "g", "zahăr", None)),
        ("1,5 kg ardei capia", (1.5, None, "kg", "ardei capia", None)),
        ("1 kg carne tocata vita", (1, None, "kg", "carne tocata vita", None)),
        ("200 ml lapte (cald)", (200, None, "ml", "lapte", "cald")),
        ("1 lingurita sare", (1, None, "linguriță", "sare", None)),
        ("2 linguri de zahăr", (2, None, "lingură", "zahăr", None)),
        ("3 lingurițe ulei", (3, None, "linguriță", "ulei", None)),
        ("1/2 linguriță bicarbonat", (0.5, None, "linguriță", "bicarbonat", None)),
        ("1 1/2 cană făină", (1.5, None, "cană", "făină", None)),
        ("1 și 1/2 cană lapte", (1.5, None, "cană", "lapte", None)),
        ("½ cană apă", (0.5, None, "cană", "apă", None)),
        ("1–2 căței de usturoi, zdrobiți", (None, "1-2", "cățel", "usturoi", "zdrobiți")),
        ("8-10 boabe de piper", (None, "8-10", None, "boabe de piper", None)),
        ("80-100 ml passata de rosii", (None, "80-100", "ml", "passata de rosii", None)),
        ("un praf de sare", (None, "un praf", None, "sare", None)),
        ("1 vârf de cuțit de nucșoară", (None, "1 vârf de cuțit", None, "nucșoară", None)),
        ("o ceapă mare", (1, None, None, "ceapă mare", None)),
        ("două ouă", (2, None, None, "ouă", None)),
        ("jumătate de lămâie", (0.5, None, None, "lămâie", None)),
        ("2 ouă", (2, None, None, "ouă", None)),
        ("1 ceapa (tocata marunt)", (1, None, None, "ceapa", "tocata marunt")),
        ("1 legatura patrunjel (tocat)", (1, None, "legătură", "patrunjel", "tocat")),
        ("150 g iaurt grecesc (10% grasime.)", (150, None, "g", "iaurt grecesc", "10% grasime")),
        ("1 conservă roșii întregi în suc (400 g)", (1, None, "conservă", "roșii întregi în suc", "400 g")),
        ("60 g cașcaval, ras", (60, None, "g", "cașcaval", "ras")),
        ("Sare", (None, None, None, "sare", None)),
        ("sare, piper", (None, None, None, "sare, piper", None)),
        ("sare, după gust", (None, None, "la gust", "sare", None)),
        ("ardei iute sau fulgi de chilli, după gust", (None, None, "la gust", "ardei iute sau fulgi de chilli", None)),
        ("piper dupa gust", (None, None, "la gust", "piper", None)),
        ("puțin ulei de măsline (opțional)", (None, None, None, "puțin ulei de măsline", "opțional")),
        ("1 ceapă mică, tocată fin (opțional)", (1, None, None, "ceapă mică", "tocată fin, opțional")),
        ("aproximativ 4 l supa de oase de vita, strecurata", (4, None, "l", "supa de oase de vita", "strecurata, aproximativ")),
        ("1 bucată ghimbir", (1, None, "bucată", "ghimbir", None)),
        ("2 felii de pâine", (2, None, "felie", "pâine", None)),
        ("1 plic drojdie uscată", (1, None, "plic", "drojdie uscată", None)),
        ("10 g sare", (10, None, "g", "sare", None)),
        ("1 litru lapte", (1, None, "l", "lapte", None)),
        ("lapte", (None, None, None, "lapte", None)),
        ("- 250 g unt", (250, None, "g", "unt", None)),
        ("• 2 morcovi", (2, None, None, "morcovi", None)),
        ("4 catei usturoi", (4, None, "cățel", "usturoi", None)),
        ("1 pahar de vin alb", (1, None, "pahar", "vin alb", None)),
        ("50 g orez (optional)", (50, None, "g", "orez", "opțional")),
        ("Ceapă roşie", (None, None, None, "ceapă roșie", None)),
        ("160 g paste tortiglioni Băneasa", (160, None, "g", "paste tortiglioni Băneasa", None)),
        ("1 lingură untură", (1, None, "lingură", "untură", None)),
        ("1 lingurita cu varf Curcuma (turmeric)", (1, None, "linguriță", "curcuma", "cu varf, turmeric")),
        ("1 felie medie de telina (aproximativ 30 g)", (1, None, "felie", "telina", "medie, aproximativ 30 g")),
        ("2 linguri bune de boia", (2, None, "lingură", "boia", "bune")),
        ("Un praf sare", (None, "un praf", None, "sare", None)),
        ("1 vârf linguriță piper", (None, "1 vârf de linguriță", None, "piper", None)),
    ],
)
def test_parse(line, expected):
    assert p(line) == expected


def test_lapte_is_not_litre():
    assert p("lapte de cocos") == (None, None, None, "lapte de cocos", None)


def test_empty():
    assert p("   ") == (None, None, None, "", None)


def test_unparseable_kept_whole():
    r = parse_ingredient("()")
    assert r["name"] == "()"
