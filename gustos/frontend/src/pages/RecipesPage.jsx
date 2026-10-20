import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Heart, Plus, Search, SearchX, Video, X } from "lucide-react";
import { api } from "../api.js";
import { useApp } from "../AppContext.jsx";
import { sourceLabel } from "../format.js";
import useDebounced from "../useDebounced.js";
import PageHeader from "../components/PageHeader.jsx";
import Popover from "../components/Popover.jsx";
import IngredientFilter from "../components/IngredientFilter.jsx";
import { RecipeGrid } from "../components/RecipeCard.jsx";

const SORTS = [
  { id: "relevance", label: "Relevanță", needsQuery: true },
  { id: "recent", label: "Adăugate recent" },
  { id: "updated", label: "Modificate recent" },
  { id: "title", label: "Titlu (A–Z)" },
  { id: "time", label: "Timp total" },
];

// Filtrele stau în adresa paginii (?q=…&categorie=…&ingredient=…&tag=…&sursa=…&favorite=1&video=1&ale-mele=1&sortare=…),
// deci se păstrează la „Înapoi” și se pot salva ca semn de carte.
function Chip({ children, onRemove }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1 text-sm font-medium text-accent-strong">
      {children}
      <button type="button" onClick={onRemove} className="rounded-full p-1 hover:bg-surface/60" aria-label="Elimină filtrul">
        <X size={14} />
      </button>
    </span>
  );
}

export default function RecipesPage() {
  const [params, setParams] = useSearchParams();
  const { categories } = useApp();
  const [text, setText] = useState(params.get("q") ?? "");
  const query = useDebounced(text.trim(), 250);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tags, setTags] = useState([]);
  const [sources, setSources] = useState([]);

  const categoryId = params.get("categorie");
  const ingredients = params.getAll("ingredient");
  const selectedTags = params.getAll("tag");
  const source = params.get("sursa");
  const favorite = params.get("favorite") === "1";
  const withVideo = params.get("video") === "1";
  const mine = params.get("ale-mele") === "1";
  const sort = params.get("sortare");
  const category = categories.find((c) => String(c.id) === categoryId);

  const update = (changes, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      for (const v of [].concat(value ?? [])) if (v !== "" && v !== false) next.append(key, v);
    }
    setParams(next, { replace });
  };

  // Textul căutat ajunge în adresă cu mică întârziere; adresa schimbată din afară (SideBar) resetează câmpul.
  useEffect(() => {
    if ((params.get("q") ?? "") !== query) update({ q: query }, { replace: true });
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = params.get("q") ?? "";
    if (q !== query) setText(q);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const apiQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (params.get("q")) p.set("q", params.get("q"));
    if (categoryId) p.set("category", categoryId);
    ingredients.forEach((i) => p.append("ingredient", i));
    selectedTags.forEach((t) => p.append("tags", t));
    if (source) p.set("source", source);
    if (favorite) p.set("favorite", "true");
    if (withVideo) p.set("video", "true");
    if (mine) p.set("own", "true");
    if (sort) p.set("sort", sort);
    return p.toString();
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/recipes?${apiQuery}`)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [apiQuery]);

  useEffect(() => {
    api.get("/api/tags").then(setTags).catch(() => {});
    api.get("/api/sources").then(setSources).catch(() => {});
  }, []);

  const hasFilters = Boolean(params.get("q") || ingredients.length || selectedTags.length || source || favorite || withVideo);
  const resetFilters = () => {
    setText("");
    // categoria și „Rețetele mele” (alese din stânga) rămân
    setParams({ ...(categoryId && { categorie: categoryId }), ...(mine && { "ale-mele": "1" }) });
  };

  const title = category
    ? category.name
    : mine
      ? "Rețetele mele"
      : favorite
        ? "Favorite"
        : withVideo
          ? "Rețete cu video"
          : "Toate rețetele";

  const sortOptions = SORTS.filter((s) => !s.needsQuery || params.get("q"));
  const activeSort = sort && sortOptions.some((s) => s.id === sort) ? sort : params.get("q") ? "relevance" : "recent";

  const setFavoriteLocally = (id, fav) =>
    setResult((r) => r && { ...r, items: r.items.map((i) => (i.id === id ? { ...i, favorite: fav } : i)) });

  const toggleTag = (name) =>
    update({ tag: selectedTags.includes(name) ? selectedTags.filter((t) => t !== name) : [...selectedTags, name] });

  const count = result?.total;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={count == null ? " " : count === 1 ? "1 rețetă" : `${count} rețete`}
      />

      <div className="relative mb-4">
        <Search size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Caută după titlu, ingrediente, tag-uri…"
          aria-label="Caută rețete"
          className="h-14 w-full rounded-2xl border border-border bg-surface pl-13 pr-12 text-lg shadow-card outline-none placeholder:text-muted focus:border-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Șterge textul căutat"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <IngredientFilter exclude={ingredients} onAdd={(name) => update({ ingredient: [...ingredients, name] })} />

        <Popover label={selectedTags.length ? `Tag-uri (${selectedTags.length})` : "Tag-uri"} active={selectedTags.length > 0}>
          {tags.length === 0 && <p className="px-3 py-2 text-sm text-muted">Nu există încă tag-uri.</p>}
          {tags.map((t) => {
            const on = selectedTags.includes(t.name);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.name)}
                role="menuitemcheckbox"
                aria-checked={on}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2"
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${on ? "border-accent bg-accent text-on-accent" : "border-border"}`}>
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="flex-1">{t.name}</span>
                <span className="text-sm text-muted tabular-nums">{t.recipe_count}</span>
              </button>
            );
          })}
        </Popover>

        <select
          value={source ?? ""}
          onChange={(e) => update({ sursa: e.target.value })}
          aria-label="Sursă"
          className={`h-11 rounded-2xl border px-3 font-medium outline-none ${source ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface"}`}
        >
          <option value="">Toate sursele</option>
          {sources.map((s) => (
            <option key={s.source_site} value={s.source_site}>
              {sourceLabel(s.source_site)} ({s.recipe_count})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => update({ favorite: favorite ? "" : "1" })}
          aria-pressed={favorite}
          className={`flex h-11 items-center gap-2 rounded-2xl border px-4 font-medium ${favorite ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface hover:bg-surface-2"}`}
        >
          <Heart size={18} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
          Doar favorite
        </button>

        <button
          type="button"
          onClick={() => update({ video: withVideo ? "" : "1" })}
          aria-pressed={withVideo}
          className={`flex h-11 items-center gap-2 rounded-2xl border px-4 font-medium ${withVideo ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface hover:bg-surface-2"}`}
        >
          <Video size={18} aria-hidden="true" />
          Cu video
        </button>

        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Sortare
          <select
            value={activeSort}
            onChange={(e) => update({ sortare: e.target.value })}
            className="h-11 rounded-2xl border border-border bg-surface px-3 font-medium text-text outline-none"
          >
            {sortOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasFilters && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {ingredients.map((i) => (
            <Chip key={`i-${i}`} onRemove={() => update({ ingredient: ingredients.filter((x) => x !== i) })}>
              {i}
            </Chip>
          ))}
          {selectedTags.map((t) => (
            <Chip key={`t-${t}`} onRemove={() => toggleTag(t)}>
              #{t}
            </Chip>
          ))}
          {source && <Chip onRemove={() => update({ sursa: "" })}>{sourceLabel(source)}</Chip>}
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="px-2 py-1 text-sm font-medium text-accent hover:underline">
              Resetează filtrele
            </button>
          )}
        </div>
      )}

      {error && <p className="rounded-2xl bg-surface p-6 text-center">{error}</p>}

      {result && !error && result.items.length > 0 && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <RecipeGrid recipes={result.items} onFavoriteChange={setFavoriteLocally} />
        </div>
      )}

      {result && !error && result.items.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <SearchX size={44} className="text-muted" aria-hidden="true" />
          <p className="text-xl font-semibold">Nicio rețetă găsită</p>
          {hasFilters ? (
            <button type="button" onClick={resetFilters} className="rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent">
              Resetează filtrele
            </button>
          ) : (
            <Link to="/adauga" className="flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent">
              <Plus size={20} /> Adaugă o rețetă
            </Link>
          )}
        </div>
      )}
    </>
  );
}
