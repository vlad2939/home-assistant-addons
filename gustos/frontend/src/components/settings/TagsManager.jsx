import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import { api } from "../../api.js";
import { useApp } from "../../AppContext.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { IconButton, TextInput } from "../form/fields.jsx";
import { Notice, Section } from "./common.jsx";

const plural = (n) => `${n} ${n === 1 ? "rețetă" : "rețete"}`;
const fold = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Row({ tag, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);

  const cancel = () => {
    setEditing(false);
    setName(tag.name);
  };
  const save = async () => {
    if (name.trim().toLowerCase() === tag.name) return cancel();
    if (await onRename(tag, name)) setEditing(false);
  };

  return (
    <li className="flex items-center gap-2 py-2">
      {editing ? (
        <>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.stopPropagation();
                cancel();
              }
            }}
            autoFocus
            aria-label="Numele tag-ului"
          />
          <IconButton label="Salvează numele" onClick={save}>
            <Check size={18} />
          </IconButton>
          <IconButton label="Renunță" onClick={cancel}>
            <X size={18} />
          </IconButton>
        </>
      ) : (
        <>
          <Link to={`/retete?tag=${encodeURIComponent(tag.name)}`} className="flex-1 truncate font-medium hover:text-accent hover:underline">
            #{tag.name}
          </Link>
          <span className="w-20 text-right text-sm text-muted tabular-nums">{plural(tag.recipe_count)}</span>
          <IconButton label="Redenumește" onClick={() => setEditing(true)}>
            <Pencil size={18} />
          </IconButton>
          <IconButton label="Șterge tag-ul" onClick={() => onDelete(tag)}>
            <Trash2 size={18} />
          </IconButton>
        </>
      )}
    </li>
  );
}

export default function TagsManager() {
  const { refreshCatalog } = useApp();
  const [tags, setTags] = useState(null);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => api.get("/api/tags").then(setTags), []);

  useEffect(() => {
    load().catch((e) => setMessage({ kind: "error", text: e.message }));
  }, [load]);

  const rename = async (tag, name) => {
    setMessage(null);
    try {
      const result = await api.put(`/api/tags/${tag.id}`, { name });
      setTags(result.tags);
      refreshCatalog().catch(() => {});
      if (result.merged_into) {
        const target = result.tags.find((t) => t.id === result.merged_into);
        setMessage({ kind: "ok", text: `Tag-ul „${tag.name}” a fost unit cu „${target?.name}”.` });
      }
      return true;
    } catch (e) {
      setMessage({ kind: "error", text: e.message });
      return false;
    }
  };

  const confirmDelete = async () => {
    await api.del(`/api/tags/${toDelete.id}`);
    await load();
    refreshCatalog().catch(() => {});
    setToDelete(null);
  };

  const query = fold(filter.trim());
  const shown = (tags ?? []).filter((t) => !query || fold(t.name).includes(query));

  return (
    <Section
      title="Tag-uri"
      description="Tag-urile noi se adaugă din formularul rețetei; aici le redenumești sau le ștergi. Dacă redenumești un tag cu numele altuia existent, cele două se unesc."
    >
      {tags && tags.length === 0 && <p className="text-muted">Nu ai încă niciun tag.</p>}
      {tags && tags.length > 8 && (
        <div className="relative mb-2">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Caută un tag" aria-label="Caută un tag" className="pl-10" />
        </div>
      )}
      <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto pr-1">
        {shown.map((t) => (
          <Row key={`${t.id}-${t.name}`} tag={t} onRename={rename} onDelete={setToDelete} />
        ))}
      </ul>
      {tags && tags.length > 0 && shown.length === 0 && <p className="py-2 text-muted">Niciun tag nu se potrivește.</p>}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Ștergi tag-ul?"
        confirmLabel="Șterge"
        danger
      >
        <p>
          Tag-ul <strong>„{toDelete?.name}”</strong> va fi scos de pe {toDelete && plural(toDelete.recipe_count)}. Rețetele rămân neschimbate.
        </p>
      </ConfirmDialog>
    </Section>
  );
}
