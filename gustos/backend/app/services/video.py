"""Linkuri video: recunoașterea clipurilor YouTube / Vimeo și forma lor standard."""

import re

_YOUTUBE = re.compile(
    r"^https?://(?:[\w-]+\.)?(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/|v/)|youtu\.be/)([\w-]{11})(?![\w-])",
    re.IGNORECASE,
)
_VIMEO = re.compile(r"^https?://(?:www\.|player\.)?vimeo\.com/(?:video/)?(\d{6,12})(?!\d)", re.IGNORECASE)


def youtube_id(url: str | None) -> str | None:
    m = _YOUTUBE.match(url or "")
    return m.group(1) if m else None


def canonical(url: str | None) -> str | None:
    """YouTube → https://www.youtube.com/watch?v=ID, Vimeo → https://vimeo.com/ID, altfel linkul neschimbat."""
    if not url:
        return None
    url = url.strip()
    if url.startswith("//"):
        url = "https:" + url
    if vid := youtube_id(url):
        return f"https://www.youtube.com/watch?v={vid}"
    if m := _VIMEO.match(url):
        return f"https://vimeo.com/{m.group(1)}"
    return url if url.lower().startswith(("http://", "https://")) else None


def is_embeddable(url: str | None) -> bool:
    """Doar clipurile YouTube și Vimeo se pot reda direct în pagina rețetei."""
    return bool(youtube_id(url) or _VIMEO.match(url or ""))
