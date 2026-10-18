import { useEffect, useRef, useState } from "react";
import { Carrot } from "lucide-react";
import { api } from "../api.js";
import useDebounced from "../useDebounced.js";

/** Câmp cu autocompletare din ingredientele existente; alegerea adaugă un filtru. */
export default function IngredientFilter({ onAdd, exclude = [] }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const prefix = useDebounced(text.trim(), 150);
  const boxRef = useRef(null);
  const excludeKey = exclude.join("|");

  useEffect(() => {
    if (!prefix) {
      setOptions([]);
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/api/ingredients?prefix=${encodeURIComponent(prefix)}`)
      .then((items) => {
        if (cancelled) return;
        setOptions(items.filter((i) => !excludeKey.split("|").includes(i.name)));
        setHighlight(0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [prefix, excludeKey]);

  useEffect(() => {
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const choose = (name) => {
    onAdd(name);
    setText("");
    setOptions([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && options[highlight]) {
      e.preventDefault();
      choose(options[highlight].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && options.length > 0;

  return (
    <div className="relative" ref={boxRef}>
      <Carrot size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Ingredient…"
        aria-label="Filtrează după ingredient"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        className="h-11 w-52 rounded-2xl border border-border bg-surface pl-10 pr-3 outline-none placeholder:text-muted focus:border-accent"
      />
      {showList && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-2 max-h-72 w-72 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-card">
          {options.map((o, i) => (
            <li key={o.name} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(o.name)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${
                  i === highlight ? "bg-surface-2" : ""
                }`}
              >
                <span>{o.name}</span>
                <span className="text-sm text-muted tabular-nums">{o.recipe_count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
