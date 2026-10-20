import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Copy, FileText, PartyPopper, Pencil, ShoppingCart, Trash2, Users } from "lucide-react";
import { api } from "../api.js";
import { formatMinutes } from "../format.js";
import { COURSES, DAYS, MEALS, addDays, longDate, menuTitle, parseDate, peopleCount, recipeCount, shortDate, toIso } from "../menu.js";
import PageHeader from "../components/PageHeader.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { OwnBadge, RecipePhoto } from "../components/RecipeCard.jsx";

const button = "flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2";

/** O rețetă din meniu: poză mică, titlu, porții. Duce la pagina rețetei. */
export function MenuItem({ item }) {
  return (
    <Link to={`/reteta/${item.recipe_id}`} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-2">
      <RecipePhoto recipe={item} className="h-14 w-14 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-medium leading-snug">{item.title}</span>
        <span className="block text-sm text-muted">
          {[`${item.servings} ${item.servings === 1 ? "porție" : "porții"}`, formatMinutes(item.total_time)].filter(Boolean).join(" · ")}
        </span>
      </span>
      {item.own && <OwnBadge className="hidden sm:inline-flex" />}
    </Link>
  );
}

function Slot({ label, items }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function WeekView({ menu }) {
  const start = parseDate(menu.start_date);
  const today = toIso(new Date());
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {DAYS.map((name, day) => {
        const date = addDays(start, day);
        const items = menu.items.filter((i) => i.day === day);
        const isToday = toIso(date) === today;
        return (
          <section
            key={day}
            className={`rounded-3xl border bg-surface p-4 shadow-card ${isToday ? "border-2 border-accent" : "border-border"}`}
            aria-label={name}
          >
            <h2 className="mb-2 flex items-baseline justify-between gap-2 px-2">
              <span className="text-lg font-semibold">{name}</span>
              <span className={`text-sm ${isToday ? "font-semibold text-accent" : "text-muted"}`}>{isToday ? "azi" : shortDate(date)}</span>
            </h2>
            {items.length === 0 ? (
              <p className="px-2 pb-2 text-sm text-muted">Nimic planificat.</p>
            ) : (
              <div className="space-y-3">
                {MEALS.map((meal) => (
                  <Slot key={meal.id} label={meal.label} items={items.filter((i) => i.slot === meal.id)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EventView({ menu }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {COURSES.map((course) => {
        const items = menu.items.filter((i) => i.slot === course.id);
        if (!items.length) return null;
        return (
          <section key={course.id} className="rounded-3xl border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-2 px-2 text-lg font-semibold">{course.label}</h2>
            <div className="space-y-1">
              {items.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
      {menu.items.length === 0 && <p className="text-muted">Meniul nu are încă rețete. Apasă „Editează” ca să le adaugi.</p>}
    </div>
  );
}

export default function MenuPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyError, setCopyError] = useState(null);

  useEffect(() => {
    setMenu(null);
    api.get(`/api/menus/${id}`).then(setMenu).catch(setError);
  }, [id]);

  if (error) {
    return (
      <>
        <PageHeader title={error.status === 404 ? "Meniul nu există" : "Meniul nu s-a putut încărca"} subtitle={error.message} />
        <Link to="/meniu" className="font-medium text-accent hover:underline">
          Înapoi la meniuri
        </Link>
      </>
    );
  }
  if (!menu) return <p className="text-muted">Se încarcă…</p>;

  const isWeek = menu.kind === "week";

  const toShopping = async () => {
    setCopyError(null);
    try {
      const r = await api.post("/api/shopping/from-menu", { menu_id: menu.id });
      navigate("/cumparaturi", { state: { notice: `Am adăugat ingredientele din „${menuTitle(menu)}”: ${r.added} ingrediente, cele identice adunate.` } });
    } catch (e) {
      setCopyError(e.message);
    }
  };

  // „Copiază în săptămâna următoare”: dacă există deja, se deschide meniul acela
  const copyNextWeek = async () => {
    setCopyError(null);
    const next = toIso(addDays(parseDate(menu.start_date), 7));
    try {
      const copy = await api.post(`/api/menus/${menu.id}/copy`, { start_date: next });
      navigate(`/meniu/${copy.id}`);
    } catch (e) {
      if (e.status === 409) {
        const [existing] = await api.get(`/api/menus?week=${next}`);
        setCopyError(
          <>
            Săptămâna următoare are deja un meniu.{" "}
            <Link to={`/meniu/${existing?.id}`} className="font-medium text-accent hover:underline">
              Deschide-l
            </Link>
          </>,
        );
      } else setCopyError(e.message);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/meniu" className="flex items-center gap-2 rounded-xl py-2 pr-3 font-medium text-muted hover:text-text">
          <ArrowLeft size={20} aria-hidden="true" /> Meniuri
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {menu.items.length > 0 && (
            <button type="button" onClick={toShopping} className={button} title="Adaugă ingredientele tuturor rețetelor din meniu">
              <ShoppingCart size={18} aria-hidden="true" /> Listă de cumpărături
            </button>
          )}
          {isWeek && (
            <button type="button" onClick={copyNextWeek} className={button} title="Copiază toate rețetele în săptămâna următoare">
              <Copy size={18} aria-hidden="true" /> Copiază în săptămâna următoare
            </button>
          )}
          <Link to={`/tipar/meniu/${menu.id}`} className={button} title="Meniul ca PDF sau la imprimantă">
            <FileText size={18} aria-hidden="true" /> PDF
          </Link>
          <Link to={`/meniu/${menu.id}/editeaza`} className={button}>
            <Pencil size={18} aria-hidden="true" /> Editează
          </Link>
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${button} text-[var(--accent-red)]`}>
            <Trash2 size={18} aria-hidden="true" /> Șterge
          </button>
        </div>
      </div>
      {copyError && <p className="mb-4 rounded-2xl border border-[var(--accent-orange)] bg-surface p-4">{copyError}</p>}

      <PageHeader title={menuTitle(menu)} subtitle={[!isWeek && longDate(menu.start_date), recipeCount(menu.items.length)].filter(Boolean).join(" · ")} />
      <p className="-mt-3 mb-6 flex items-center gap-2 text-muted">
        {isWeek ? <CalendarDays size={18} aria-hidden="true" /> : <PartyPopper size={18} aria-hidden="true" />}
        <Users size={18} aria-hidden="true" /> {peopleCount(menu.guests)}
      </p>
      {menu.notes && <p className="mb-6 whitespace-pre-line rounded-3xl border border-border bg-surface p-5 leading-relaxed">{menu.notes}</p>}

      {isWeek ? <WeekView menu={menu} /> : <EventView menu={menu} />}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await api.del(`/api/menus/${menu.id}`);
          navigate("/meniu", { replace: true });
        }}
        title="Ștergi meniul?"
        confirmLabel="Șterge meniul"
        danger
      >
        <p>
          Meniul <strong>„{menuTitle(menu)}”</strong> va fi șters. Rețetele rămân neschimbate.
        </p>
      </ConfirmDialog>
    </>
  );
}
