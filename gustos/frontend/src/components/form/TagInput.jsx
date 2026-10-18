import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../api.js";
import { inputClass } from "./fields.jsx";

/** Tag-uri ca etichete: Enter sau virgulă adaugă, sugestii din tag-urile existente. */
export default function TagInput({ value, onChange, id }) {
  const [text, setText] = useState("");
  const [known, setKnown] = useState([]);

  useEffect(() => {
    api.get("/api/tags").then((tags) => setKnown(tags.map((t) => t.name))).catch(() => {});
  }, []);

  const add = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const suggestions = known.filter((t) => !value.includes(t));

  return (
    <div>
      <div className={`${inputClass} flex h-auto min-h-12 flex-wrap items-center gap-2 border-border py-2 focus-within:border-accent`}>
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1 text-sm font-medium text-accent-strong">
            #{tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded-full p-1 hover:bg-surface/60" aria-label={`Elimină tag-ul ${tag}`}>
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setText(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => text && add(text)}
          list="gustos-tags"
          placeholder={value.length ? "" : "ex. tradițional, rapid…"}
          className="min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>
      <datalist id="gustos-tags">
        {suggestions.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 12).map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className="rounded-full border border-border px-2.5 py-1 text-sm text-muted hover:border-accent hover:text-text">
              + {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
