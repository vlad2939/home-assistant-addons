"""Normalizarea textelor românești."""

import unicodedata

# Multe site-uri folosesc ş/ţ cu sedilă în loc de ș/ț cu virgulă dedesubt.
_CEDILLA = str.maketrans({"ş": "ș", "Ş": "Ș", "ţ": "ț", "Ţ": "Ț"})


def fix_romanian(text: str | None) -> str | None:
    """Înlocuiește ş/ţ (sedilă) cu ș/ț (virgulă) și elimină spațiile de la capete."""
    if text is None:
        return None
    return unicodedata.normalize("NFC", text).translate(_CEDILLA).strip()


def normalize(text: str | None) -> str:
    """Formă pentru căutare/autocompletare: fără diacritice, litere mici, spații unice."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFD", text.translate(_CEDILLA))
    plain = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(plain.lower().split())
