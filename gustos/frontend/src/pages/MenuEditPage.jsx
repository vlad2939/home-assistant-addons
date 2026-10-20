import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Minus, Plus, Save, Users, X } from "lucide-react";
import { api } from "../api.js";
import { COURSES, DAYS, MEALS, mondayOf, parseDate, toIso, weekRange } from "../menu.js";
import PageHeader from "../components/PageHeader.jsx";
import RecipePicker from "../components/RecipePicker.jsx";
import { RecipePhoto } from "../components/RecipeCard.jsx";
import { Field, FormSection, TextArea, TextInput } from "../components/form/fields.jsx";
import UnsavedChangesGuard from "../components/form/UnsavedChangesGuard.jsx";

let nextKey = 1;
const withKey = (item) => ({ ...item, key: nextKey++ });

function emptyMenu(kind, date) {
  const today = new Date();
  return {
    kind,
    title: "",
    start_date: kind === "week" ? toIso(mondayOf(date ? parseDate(date) : today)) : date || toIso(today),
    guests: kind === "week" ? 2 : 6,
    notes: "",
    items: [],
  };
}

const toPayload = (form) => ({
  kind: form.kind,
  title: form.title.trim() || null,
  start_date: form.start_date,
  guests: form.guests,
  notes: form.notes.trim() || null,
  items: form.items.map(({ recipe_id, day, slot, servings }) => ({ recipe_id, day, slot, servings })),
});

function Stepper({ value, onChange, label, min = 1, max = 200 }) {
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-surface-2 disabled:opacity-40";
  return (
    <span className="flex items-center gap-1.5" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label}: mai puțin`}>
        <Minus size={16} />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label}: mai mult`}>
        <Plus size={16} />
      </button>
    </span>
  );
}

function SlotEditor({ label, items, onAdd, onChange, onRemove, large = false }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        {large ? <h2 className="text-lg font-semibold">{label}</h2> : <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>}
        <button type="button" onClick={onAdd} className="flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft">
          <Plus size={16} aria-hidden="true" /> Adaugă
        </button>
      </div>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2 rounded-2xl py-1.5">
          <RecipePhoto recipe={item} className="h-11 w-11 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1 truncate font-medium" title={item.title}>
            {item.title}
          </span>
          <Stepper value={item.servings} onChange={(servings) => onChange(item.key, { servings })} label={`Porții ${item.title}`} />
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-[var(--accent-red)]"
            aria-label={`Scoate ${item.title} din meniu`}
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function MenuEditPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(() =>
    id ? null : emptyMenu(search.get("tip") === "eveniment" ? "event" : "week", search.get("data")),
  );
  const [initial, setInitial] = useState(() => (form ? JSON.stringify(toPayload(form)) : null));
  const [picker, setPicker] = useState(null); // { day, slot, label }
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/menus/${id}`)
      .then((menu) => {
        const f = { ...menu, title: menu.title ?? "", notes: menu.notes ?? "", items: menu.items.map(withKey) };
        setForm(f);
        setInitial(JSON.stringify(toPayload(f)));
      })
      .catch((e) => setError({ message: e.message }));
  }, [id]);

  useEffect(() => {
    if (saved) navigate(`/meniu/${saved}`, { replace: true });
  }, [saved, navigate]);

  const dirty = useMemo(() => Boolean(form) && !saved && JSON.stringify(toPayload(form)) !== initial, [form, initial, saved]);

  if (!form) return error ? <PageHeader title="Meniul nu s-a putut încărca" subtitle={error.message} /> : <p className="text-muted">Se încarcă…</p>;

  const isWeek = form.kind === "week";
  const set = (change) => setForm((f) => ({ ...f, ...change }));
  const changeItem = (key, change) => set({ items: form.items.map((i) => (i.key === key ? { ...i, ...change } : i)) });
  const removeItem = (key) => set({ items: form.items.filter((i) => i.key !== key) });
  const addRecipe = (recipe) => {
    set({
      items: [
        ...form.items,
        withKey({ recipe_id: recipe.id, day: picker.day, slot: picker.slot, servings: form.guests, title: recipe.title, photo: recipe.photo }),
      ],
    });
    setPicker(null);
  };
  const slotItems = (day, slot) => form.items.filter((i) => i.slot === slot && (day === null || i.day === day));

  const save = async (e) => {
    e.preventDefault();
    if (!isWeek && !form.title.trim()) {
      setError({ message: "Scrie numele evenimentului (de exemplu „Crăciun”)." });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const menu = id ? await api.put(`/api/menus/${id}`, toPayload(form)) : await api.post("/api/menus", toPayload(form));
      setSaved(menu.id);
    } catch (err) {
      let existing = null;
      if (err.status === 409) [existing] = await api.get(`/api/menus?week=${form.start_date}`).catch(() => []);
      setError({ message: err.message, existing });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={id ? "Editează meniul" : isWeek ? "Meniu săptămânal nou" : "Eveniment nou"}
        subtitle={isWeek ? weekRange(form.start_date) : undefined}
      />

      <FormSection title={isWeek ? "Săptămâna" : "Evenimentul"}>
        <div className="grid gap-4 md:grid-cols-3">
          {!isWeek && (
            <Field label="Nume *" htmlFor="m-title" className="md:col-span-3">
              <TextInput id="m-title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="ex. Crăciun, ziua lui Andrei" />
            </Field>
          )}
          <Field
            label={isWeek ? "Orice zi din săptămână" : "Data"}
            htmlFor="m-date"
            hint={isWeek ? "Meniul începe mereu lunea." : undefined}
          >
            <TextInput
              id="m-date"
              type="date"
              value={form.start_date}
              onChange={(e) => e.target.value && set({ start_date: isWeek ? toIso(mondayOf(parseDate(e.target.value))) : e.target.value })}
            />
          </Field>
          <Field label="Câte persoane" hint="Rețetele noi primesc atâtea porții.">
            <div className="flex h-12 flex-wrap items-center gap-3">
              <Users size={20} className="text-accent" aria-hidden="true" />
              <Stepper value={form.guests} onChange={(guests) => set({ guests })} label="Persoane" />
              {form.items.some((i) => i.servings !== form.guests) && (
                <button
                  type="button"
                  onClick={() => set({ items: form.items.map((i) => ({ ...i, servings: form.guests })) })}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Aplică la toate rețetele
                </button>
              )}
            </div>
          </Field>
          <Field label="Note" htmlFor="m-notes" className={isWeek ? "" : "md:col-span-3"}>
            <TextArea id="m-notes" rows={isWeek ? 1 : 2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="ex. invitați, cumpărături speciale" />
          </Field>
        </div>
      </FormSection>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isWeek
          ? DAYS.map((name, day) => (
              <section key={day} className="rounded-3xl border border-border bg-surface p-4 shadow-card">
                <h2 className="mb-2 text-lg font-semibold">{name}</h2>
                <div className="space-y-3">
                  {MEALS.map((meal) => (
                    <SlotEditor
                      key={meal.id}
                      label={meal.label}
                      items={slotItems(day, meal.id)}
                      onAdd={() => setPicker({ day, slot: meal.id, label: `${name} · ${meal.label}` })}
                      onChange={changeItem}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </section>
            ))
          : COURSES.map((course) => (
              <section key={course.id} className="rounded-3xl border border-border bg-surface p-4 shadow-card">
                <SlotEditor
                  label={course.label}
                  large
                  items={slotItems(null, course.id)}
                  onAdd={() => setPicker({ day: null, slot: course.id, label: course.label })}
                  onChange={changeItem}
                  onRemove={removeItem}
                />
              </section>
            ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-bg/90 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        {error && (
          <p className="mr-auto text-[var(--accent-red)]" role="alert">
            {error.message}{" "}
            {error.existing && (
              <Link to={`/meniu/${error.existing.id}`} className="font-medium text-accent hover:underline">
                Deschide meniul existent
              </Link>
            )}
          </p>
        )}
        <button type="button" onClick={() => navigate(-1)} className="h-12 rounded-2xl border border-border bg-surface px-5 font-medium hover:bg-surface-2">
          Anulează
        </button>
        <button type="submit" disabled={saving} className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-on-accent disabled:opacity-60">
          <Save size={20} aria-hidden="true" /> {saving ? "Se salvează…" : "Salvează meniul"}
        </button>
      </div>

      <RecipePicker open={Boolean(picker)} title={`Alege rețeta: ${picker?.label ?? ""}`} onPick={addRecipe} onClose={() => setPicker(null)} />
      <UnsavedChangesGuard when={dirty && !saving} />
    </form>
  );
}
