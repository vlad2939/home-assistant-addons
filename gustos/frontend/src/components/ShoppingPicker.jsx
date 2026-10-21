import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../api.js";
import { ingredientAmount } from "../scale.js";
import Modal from "./Modal.jsx";

const fold = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Ingredientele cu aceeași denumire (din mai multe rețete ale unui meniu) se arată o singură dată. */
function group(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = fold(row.name);
    if (!groups.has(key)) groups.set(key, { key, name: row.name, inList: false, hints: [] });
    const g = groups.get(key);
    g.inList ||= row.in_list;
    const amount = ingredientAmount(row, null, null);
    if (amount || rows.some((r) => r.recipe !== row.recipe)) g.hints.push({ amount, recipe: row.recipe });
  }
  return [...groups.values()];
}

/**
 * Fereastra „Adaugă în cumpărături”: bifezi doar ce trebuie cumpărat. Cantitatea din rețetă se vede
 * doar ca ajutor; în listă intră numai denumirea (cantitatea se poate scrie după aceea, în listă).
 *  source: { recipe_id, servings } sau { menu_id }
 */
export default function ShoppingPicker({ open, source, onClose, onAdded }) {
  const [groups, setGroups] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGroups(null);
    setSelected(new Set());
    setError(null);
    const params = new URLSearchParams(Object.entries(source).filter(([, v]) => v != null));
    api
      .get(`/api/shopping/candidates?${params}`)
      .then((rows) => setGroups(group(rows)))
      .catch((e) => setError(e.message));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const available = (groups ?? []).filter((g) => !g.inList);
  const multipleRecipes = new Set((groups ?? []).flatMap((g) => g.hints.map((h) => h.recipe))).size > 1;

  const add = async () => {
    setSaving(true);
    setError(null);
    try {
      const items = groups.filter((g) => selected.has(g.key)).map((g) => ({ name: g.name }));
      const result = await api.post("/api/shopping/items", { items });
      onAdded(result.added);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ce cumperi?" wide>
      <p className="mb-3 text-sm text-muted">
        Bifează doar produsele de cumpărat. Cantitatea din rețetă e doar un ajutor; în listă poți scrie apoi cât cumperi.
      </p>
      {!groups && !error && <p className="text-muted">Se încarcă…</p>}
      {groups && groups.length === 0 && <p className="text-muted">Nu sunt ingrediente.</p>}
      {groups && groups.length > 0 && (
        <>
          <div className="mb-2 flex justify-end gap-4 text-sm">
            <button type="button" onClick={() => setSelected(new Set(available.map((g) => g.key)))} className="font-medium text-accent hover:underline">
              Bifează tot
            </button>
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} className="font-medium text-accent hover:underline">
                Debifează tot
              </button>
            )}
          </div>
          <ul className="divide-y divide-border">
            {groups.map((g) => {
              const on = selected.has(g.key);
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => !g.inList && toggle(g.key)}
                    disabled={g.inList}
                    aria-pressed={on}
                    className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${
                        on || g.inList ? "border-accent bg-accent text-on-accent" : "border-border"
                      }`}
                      aria-hidden="true"
                    >
                      {(on || g.inList) && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[17px]">{g.name}</span>
                      {g.inList && <span className="text-sm text-muted"> · deja în listă</span>}
                      {g.hints.length > 0 && (
                        <span className="block text-sm text-muted">
                          {g.hints
                            .map((h) => [h.amount, multipleRecipes && h.recipe].filter(Boolean).join(", "))
                            .filter(Boolean)
                            .join("  ·  ")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {error && (
        <p className="mt-3 text-sm text-[var(--accent-red)]" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-border bg-surface px-5 font-medium hover:bg-surface-2">
          Renunță
        </button>
        <button
          type="button"
          onClick={add}
          disabled={!selected.size || saving}
          className="h-12 rounded-2xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-50"
        >
          {saving ? "Se adaugă…" : `Adaugă în listă${selected.size ? ` (${selected.size})` : ""}`}
        </button>
      </div>
    </Modal>
  );
}
