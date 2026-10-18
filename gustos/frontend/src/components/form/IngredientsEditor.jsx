import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, Plus, Trash2 } from "lucide-react";
import { FormSection, IconButton, TextInput, move, newKey } from "./fields.jsx";

export const UNITS = [
  "g", "kg", "ml", "l", "linguriță", "lingură", "cană", "pahar", "praf", "vârf de cuțit",
  "bucată", "cățel", "felie", "legătură", "plic", "conservă", "la gust",
];

export const emptyIngredient = () => ({ key: newKey(), quantity: "", unit: "", name: "", note: "" });
export const emptyGroup = (name = "") => ({ key: newKey(), name, items: [emptyIngredient()] });

/**
 * Ingrediente pe grupuri („Pentru aluat”, „Pentru sos”). Un singur grup fără nume = listă simplă.
 * Enter într-un rând adaugă un rând nou dedesubt; săgețile mută rândul.
 */
export default function IngredientsEditor({ groups, onChange, errors }) {
  const [focusKey, setFocusKey] = useState(null);

  useEffect(() => {
    if (!focusKey) return;
    document.querySelector(`[data-focus="${focusKey}"]`)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const setGroup = (gi, change) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...change } : g)));
  const setItem = (gi, ii, change) =>
    setGroup(gi, { items: groups[gi].items.map((it, i) => (i === ii ? { ...it, ...change } : it)) });

  const addItem = (gi, after = groups[gi].items.length - 1) => {
    const item = emptyIngredient();
    const items = [...groups[gi].items];
    items.splice(after + 1, 0, item);
    setGroup(gi, { items });
    setFocusKey(item.key);
  };

  const removeItem = (gi, ii) => {
    const items = groups[gi].items.filter((_, i) => i !== ii);
    if (items.length === 0 && groups.length > 1) onChange(groups.filter((_, i) => i !== gi));
    else setGroup(gi, { items: items.length ? items : [emptyIngredient()] });
  };

  const addGroup = () => {
    const group = emptyGroup();
    onChange([...groups, group]);
    setFocusKey(`group-${group.key}`);
  };

  const onRowKeyDown = (e, gi, ii) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(gi, ii);
    }
  };

  const grouped = groups.length > 1 || groups[0]?.name;

  return (
    <FormSection
      title="Ingrediente"
      action={
        <button type="button" onClick={addGroup} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <FolderPlus size={17} aria-hidden="true" /> Adaugă grup
        </button>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Cantitatea poate fi un număr („500”, „0,5”, „1 1/2”) care se scalează cu porțiile, sau un text („2-3”, „un praf”) care
        rămâne neschimbat. Apasă <kbd className="rounded bg-surface-2 px-1.5">Enter</kbd> pentru un rând nou.
      </p>

      <div className="space-y-6">
        {groups.map((group, gi) => (
          <div key={group.key} className={grouped ? "rounded-2xl border border-border p-3 lg:p-4" : ""}>
            {grouped && (
              <div className="mb-3 flex items-center gap-2">
                <TextInput
                  value={group.name}
                  onChange={(e) => setGroup(gi, { name: e.target.value })}
                  placeholder="Nume grup (ex. Pentru sos)"
                  aria-label="Numele grupului"
                  data-focus={`group-${group.key}`}
                  className="font-semibold"
                />
                <IconButton label="Mută grupul mai sus" onClick={() => onChange(move(groups, gi, -1))} disabled={gi === 0}>
                  <ArrowUp size={18} />
                </IconButton>
                <IconButton label="Mută grupul mai jos" onClick={() => onChange(move(groups, gi, 1))} disabled={gi === groups.length - 1}>
                  <ArrowDown size={18} />
                </IconButton>
                <IconButton
                  label="Șterge grupul"
                  onClick={() => onChange(groups.length > 1 ? groups.filter((_, i) => i !== gi) : [{ ...group, name: "" }])}
                >
                  <Trash2 size={18} />
                </IconButton>
              </div>
            )}

            <div className="hidden gap-2 px-1 pb-1 text-xs font-medium uppercase tracking-wider text-muted md:grid md:grid-cols-[4.5rem_6.5rem_1fr_7rem_7.5rem] lg:grid-cols-[6rem_8rem_1fr_9rem_7.5rem]">
              <span>Cantitate</span>
              <span>Unitate</span>
              <span>Denumire</span>
              <span>Notă</span>
            </div>

            <ul className="space-y-2">
              {group.items.map((item, ii) => {
                const error = errors[`ing-${item.key}`];
                return (
                  <li key={item.key}>
                    <div className="grid grid-cols-[1fr_1fr] gap-2 rounded-2xl bg-surface-2 p-2 md:grid-cols-[4.5rem_6.5rem_1fr_7rem_7.5rem] lg:grid-cols-[6rem_8rem_1fr_9rem_7.5rem] md:bg-transparent md:p-0">
                      <TextInput
                        value={item.quantity}
                        onChange={(e) => setItem(gi, ii, { quantity: e.target.value })}
                        onKeyDown={(e) => onRowKeyDown(e, gi, ii)}
                        placeholder="Cantitate"
                        aria-label="Cantitate"
                        data-focus={item.key}
                      />
                      <TextInput
                        value={item.unit}
                        onChange={(e) => setItem(gi, ii, { unit: e.target.value })}
                        onKeyDown={(e) => onRowKeyDown(e, gi, ii)}
                        list="gustos-units"
                        placeholder="Unitate"
                        aria-label="Unitate"
                      />
                      <TextInput
                        value={item.name}
                        onChange={(e) => setItem(gi, ii, { name: e.target.value })}
                        onKeyDown={(e) => onRowKeyDown(e, gi, ii)}
                        placeholder="Denumire (ex. făină)"
                        aria-label="Denumire ingredient"
                        invalid={Boolean(error)}
                        className="col-span-2 md:col-span-1"
                      />
                      <TextInput
                        value={item.note}
                        onChange={(e) => setItem(gi, ii, { note: e.target.value })}
                        onKeyDown={(e) => onRowKeyDown(e, gi, ii)}
                        placeholder="Notă"
                        aria-label="Notă"
                      />
                      <div className="flex items-center justify-end">
                        <IconButton label="Mută mai sus" onClick={() => setGroup(gi, { items: move(group.items, ii, -1) })} disabled={ii === 0}>
                          <ArrowUp size={18} />
                        </IconButton>
                        <IconButton
                          label="Mută mai jos"
                          onClick={() => setGroup(gi, { items: move(group.items, ii, 1) })}
                          disabled={ii === group.items.length - 1}
                        >
                          <ArrowDown size={18} />
                        </IconButton>
                        <IconButton label="Șterge ingredientul" onClick={() => removeItem(gi, ii)}>
                          <Trash2 size={18} />
                        </IconButton>
                      </div>
                    </div>
                    {error && (
                      <p className="mt-1 px-1 text-sm text-[var(--accent-red)]" role="alert">
                        {error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <button type="button" onClick={() => addItem(gi)} className="mt-3 flex items-center gap-1.5 rounded-xl px-2 py-2 font-medium text-accent hover:bg-accent-soft">
              <Plus size={18} aria-hidden="true" /> Adaugă ingredient
            </button>
          </div>
        ))}
      </div>

      <datalist id="gustos-units">
        {UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </FormSection>
  );
}
