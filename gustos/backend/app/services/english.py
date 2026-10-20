"""Rețete în engleză: temperaturi și dimensiuni în unități românești (înainte de traducere)."""

import re

# „350°F (175°C)” / „350 F / 180 C”: există deja Celsius → rămâne doar Celsius
_F_WITH_C = re.compile(
    r"(\d{2,3})\s*°?\s*(?:degrees\s+)?F(?:ahrenheit)?\b\s*[(/]?\s*(\d{2,3})\s*°?\s*(?:degrees\s+)?C(?:elsius)?\b\)?",
    re.IGNORECASE,
)
_F = re.compile(r"(\d{2,3})\s*(?:°\s*|degrees\s+)?F(?:ahrenheit)?\b", re.IGNORECASE)
_INCH = re.compile(
    r"(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?(?:\s*-\s*|\s*)(?:inch(?:es)?\b|in\.|″|\")",
    re.IGNORECASE,
)


def _celsius(f: str) -> int:
    return round((int(f) - 32) * 5 / 9 / 10) * 10  # rotunjit la 10 °C, ca pe butonul cuptorului


def _cm(inches: str) -> str:
    return f"{round(float(inches) * 2.54):d}"


def to_metric(text: str | None) -> str | None:
    """„Preheat oven to 350°F. Use a 9x13-inch pan.” → „… to 175°C. Use a 23x33 cm pan.”"""
    if not text:
        return text
    text = _F_WITH_C.sub(lambda m: f"{m.group(2)}°C", text)
    text = _F.sub(lambda m: f"{_celsius(m.group(1))}°C", text)

    def inch(m):
        size = _cm(m.group(1)) + (f"x{_cm(m.group(2))}" if m.group(2) else "")
        return f"{size} cm"

    return _INCH.sub(inch, text)
