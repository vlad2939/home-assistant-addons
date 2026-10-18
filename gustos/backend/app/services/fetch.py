"""Descărcare sigură de pe internet, pentru import.

Reguli: doar http/https, fără adrese din rețeaua locală (serverul nu poate fi păcălit să acceseze
alte dispozitive din casă), timp limită, dimensiune maximă, redirecționări verificate pas cu pas.
"""

import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx
from fastapi import HTTPException

TIMEOUT = httpx.Timeout(15.0, connect=10.0)
MAX_PAGE_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5

# Unele site-uri refuză cererile care nu arată ca venind de la un browser.
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.6",
}


class FetchError(HTTPException):
    def __init__(self, message: str, status: int = 422):
        super().__init__(status, message)


def host_of(url: str) -> str:
    return (urlsplit(url).hostname or "").lower().rstrip(".")


def site_matches(host: str, domain: str) -> bool:
    """„www.lauraadamache.ro” și „lauraadamache.ro” se potrivesc cu domeniul „lauraadamache.ro”."""
    host, domain = host.removeprefix("www."), domain.lower().removeprefix("www.")
    return host == domain or host.endswith("." + domain)


def check_url(url: str) -> str:
    parts = urlsplit(url.strip())
    if parts.scheme not in ("http", "https"):
        raise FetchError("Linkul trebuie să înceapă cu http:// sau https://")
    if not parts.hostname or parts.username or parts.password:
        raise FetchError("Linkul nu este valid.")
    if parts.port not in (None, 80, 443):
        raise FetchError("Linkul folosește un port neobișnuit și nu este acceptat.")
    return url.strip()


def check_public_host(host: str) -> None:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise FetchError("Site-ul nu a putut fi găsit. Verifică linkul și conexiunea la internet.") from None
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise FetchError("Linkul indică o adresă din rețeaua locală și a fost blocat.")


def download(url: str, *, allowed=None, max_bytes: int | None = None, client: httpx.Client | None = None) -> tuple[bytes, str, str]:
    """Descarcă un URL. allowed(host) → bool verifică fiecare pas (inclusiv redirecționările).

    Returnează (conținut, url_final, content_type).
    """
    max_bytes = max_bytes or MAX_PAGE_BYTES
    own_client = client is None
    client = client or httpx.Client(timeout=TIMEOUT, headers=HEADERS, follow_redirects=False)
    try:
        current = check_url(url)
        for _ in range(MAX_REDIRECTS + 1):
            host = host_of(current)
            if allowed and not allowed(host):
                raise FetchError(f"Site-ul {host} nu este în lista site-urilor permise.")
            check_public_host(host)
            with client.stream("GET", current) as response:
                if response.is_redirect:
                    current = check_url(urljoin(current, response.headers.get("location", "")))
                    continue
                if response.status_code >= 400:
                    raise FetchError(f"Site-ul a răspuns cu eroarea {response.status_code}. Verifică linkul.")
                declared = int(response.headers.get("content-length") or 0)
                if declared > max_bytes:
                    raise FetchError("Pagina este prea mare pentru import.")
                chunks, size = [], 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > max_bytes:
                        raise FetchError("Pagina este prea mare pentru import.")
                    chunks.append(chunk)
                return b"".join(chunks), current, response.headers.get("content-type", "")
        raise FetchError("Prea multe redirecționări.")
    except httpx.TimeoutException:
        raise FetchError("Site-ul nu a răspuns la timp. Încearcă din nou.") from None
    except httpx.HTTPError:
        raise FetchError("Pagina nu a putut fi descărcată. Verifică linkul și conexiunea la internet.") from None
    finally:
        if own_client:
            client.close()
