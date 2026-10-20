"""Punctul de pornire: API-ul /api/... și interfața React compilată."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from . import config, db
from .routers import backup, categories, import_sites, importer, lookups, photos, recipes, settings, tags


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init()
    yield


app = FastAPI(
    title="Gustos",
    version=config.version(),
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

for module in (recipes, photos, importer, import_sites, categories, tags, lookups, settings, backup):
    app.include_router(module.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": config.version()}


@app.get("/api/about")
def about():
    return {
        "name": "Gustos",
        "version": config.version(),
        "description": "Aplicație web pentru gestionarea rețetelor culinare.",
        "technologies": ["Python", "FastAPI", "SQLite", "React", "Vite", "Tailwind CSS"],
        "copyright": "© concept și realizare vlad39",
    }


@app.get("/api/manual", response_class=PlainTextResponse)
def manual():
    """Manualul de utilizare, în Markdown (afișat în modalul din Setări)."""
    return (config.APP_DIR / "docs" / "manual_utilizare.md").read_text(encoding="utf-8")


# --- Interfața (fișierele compilate din frontend/) ---

if (config.STATIC_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=config.STATIC_DIR / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str):
    if path.startswith(("api/", "photos/")):
        raise HTTPException(status_code=404)
    file = (config.STATIC_DIR / path).resolve()
    if path and file.is_file() and file.is_relative_to(config.STATIC_DIR):
        return FileResponse(file)
    index = config.STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return PlainTextResponse("Gustos rulează. Interfața nu este compilată încă (cd frontend; npm run build).")
