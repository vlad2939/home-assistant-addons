import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "../api.js";
import { formatMinutes } from "../format.js";
import useDebounced from "../useDebounced.js";
import Modal from "./Modal.jsx";
import { OwnBadge, RecipePhoto } from "./RecipeCard.jsx";

const SHOWN = 60;

/** Fereastra de alegere a unei rețete (pentru meniu): căutare după titlu, ingrediente, tag-uri. */
export default function RecipePicker({ open, title, onPick, onClose }) {
  const [text, setText] = useState("");
  const query = useDebounced(text.trim(), 200);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const params = new URLSearchParams({ sort: query ? "relevance" : "title" });
    if (query) params.set("q", query);
    api
      .get(`/api/recipes?${params}`)
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setResult({ total: 0, items: [] }));
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="relative mb-3">
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Caută după titlu, ingrediente, tag-uri…"
          autoFocus
          aria-label="Caută rețeta"
          className="h-12 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 outline-none placeholder:text-muted focus:border-accent"
        />
      </div>
      {result && result.items.length === 0 && <p className="py-4 text-center text-muted">Nicio rețetă nu se potrivește.</p>}
      <ul className="divide-y divide-border">
        {result?.items.slice(0, SHOWN).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-surface-2"
            >
              <RecipePhoto recipe={r} className="h-12 w-12 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block text-sm text-muted">{[r.category_name, formatMinutes(r.total_time)].filter(Boolean).join(" · ")}</span>
              </span>
              {r.own && <OwnBadge className="hidden sm:inline-flex" />}
            </button>
          </li>
        ))}
      </ul>
      {result && result.total > SHOWN && <p className="pt-3 text-center text-sm text-muted">Scrie în căutare ca să găsești celelalte rețete.</p>}
    </Modal>
  );
}
