import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api.js";
import { useApp } from "../../AppContext.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { IconButton, Select, TextInput } from "../form/fields.jsx";
import { Notice, Section, primaryButton } from "./common.jsx";

function Row({ category, index, total, onMove, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  const save = async () => {
    if (await onRename(category, name)) setEditing(false);
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
                setEditing(false);
                setName(category.name);
              }
            }}
            autoFocus
            aria-label="Numele categoriei"
          />
          <IconButton label="Salvează numele" onClick={save}>
            <Check size={18} />
          </IconButton>
          <IconButton
            label="Renunță"
            onClick={() => {
              setEditing(false);
              setName(category.name);
            }}
          >
            <X size={18} />
          </IconButton>
        </>
      ) : (
        <>
          <span className="flex-1 truncate font-medium">{category.name}</span>
          <span className="w-16 text-right text-sm text-muted tabular-nums">
            {category.recipe_count} {category.recipe_count === 1 ? "rețetă" : "rețete"}
          </span>
          <IconButton label="Mută mai sus" onClick={() => onMove(index, -1)} disabled={index === 0}>
            <ArrowUp size={18} />
          </IconButton>
          <IconButton label="Mută mai jos" onClick={() => onMove(index, 1)} disabled={index === total - 1}>
            <ArrowDown size={18} />
          </IconButton>
          <IconButton label="Redenumește" onClick={() => setEditing(true)}>
            <Pencil size={18} />
          </IconButton>
          <IconButton label="Șterge categoria" onClick={() => onDelete(category)}>
            <Trash2 size={18} />
          </IconButton>
        </>
      )}
    </li>
  );
}

export default function CategoriesManager() {
  const { categories, refreshCatalog } = useApp();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [moveTo, setMoveTo] = useState("");

  const run = async (action) => {
    setError(null);
    try {
      await action();
      await refreshCatalog();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const add = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    run(() => api.post("/api/categories", { name: newName })).then((ok) => ok && setNewName(""));
  };

  const move = (index, delta) => {
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    run(() => api.put("/api/categories/order", { ids }));
  };

  const rename = (category, name) => run(() => api.put(`/api/categories/${category.id}`, { name }));

  const askDelete = (category) => {
    setMoveTo("");
    setToDelete(category);
  };

  const confirmDelete = async () => {
    const query = toDelete.recipe_count ? `?move_to=${moveTo}` : "";
    await api.del(`/api/categories/${toDelete.id}${query}`);
    await refreshCatalog();
    setToDelete(null);
  };

  return (
    <Section title="Categorii" description="Ordinea de aici este și ordinea din lista din stânga.">
      <ul className="divide-y divide-border">
        {categories.map((c, i) => (
          <Row key={c.id} category={c} index={i} total={categories.length} onMove={move} onRename={rename} onDelete={askDelete} />
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Categorie nouă" aria-label="Numele categoriei noi" />
        <button type="submit" className={primaryButton} disabled={!newName.trim()}>
          <Plus size={18} aria-hidden="true" /> Adaugă
        </button>
      </form>
      {error && <Notice kind="error">{error}</Notice>}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete?.recipe_count && !moveTo) throw new Error("Alege categoria în care se mută rețetele.");
          return confirmDelete();
        }}
        title="Ștergi categoria?"
        confirmLabel={toDelete?.recipe_count ? "Mută rețetele și șterge" : "Șterge"}
        danger
      >
        {toDelete?.recipe_count ? (
          <>
            <p>
              Categoria <strong>„{toDelete.name}”</strong> are {toDelete.recipe_count}{" "}
              {toDelete.recipe_count === 1 ? "rețetă" : "rețete"}. În ce categorie le mut?
            </p>
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Categoria nouă pentru rețete">
              <option value="">Alege categoria…</option>
              {categories
                .filter((c) => c.id !== toDelete.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </>
        ) : (
          <p>
            Categoria <strong>„{toDelete?.name}”</strong> nu are rețete și va fi ștearsă.
          </p>
        )}
      </ConfirmDialog>
    </Section>
  );
}
