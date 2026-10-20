import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronRight, PartyPopper, Plus } from "lucide-react";
import { api } from "../api.js";
import { addDays, longDate, menuTitle, mondayOf, peopleCount, recipeCount, toIso } from "../menu.js";
import PageHeader from "../components/PageHeader.jsx";

function MenuRow({ menu }) {
  const Icon = menu.kind === "week" ? CalendarDays : PartyPopper;
  return (
    <li>
      <Link to={`/meniu/${menu.id}`} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2">
        <Icon size={22} className="shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{menuTitle(menu)}</span>
          <span className="block text-sm text-muted">
            {[menu.kind === "event" && longDate(menu.start_date), recipeCount(menu.item_count), peopleCount(menu.guests)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <ChevronRight size={20} className="text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Cardul „Săptămâna aceasta” / „Săptămâna viitoare”: deschide meniul sau îl creează. */
function WeekCard({ label, monday, menu }) {
  const iso = toIso(monday);
  return (
    <Link
      to={menu ? `/meniu/${menu.id}` : `/meniu/nou?tip=saptamana&data=${iso}`}
      className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent"
    >
      {menu ? <CalendarDays size={28} className="text-accent" aria-hidden="true" /> : <CalendarPlus size={28} className="text-accent" aria-hidden="true" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold uppercase tracking-wider text-accent">{label}</span>
        <span className="block truncate font-medium">{menuTitle({ kind: "week", start_date: iso }).replace("Săptămâna ", "")}</span>
        <span className="block text-sm text-muted">{menu ? recipeCount(menu.item_count) : "Nu are încă meniu. Apasă ca să-l faci."}</span>
      </span>
      <ChevronRight size={20} className="text-muted" aria-hidden="true" />
    </Link>
  );
}

export default function MenusPage() {
  const [menus, setMenus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/menus").then(setMenus).catch((e) => setError(e.message));
  }, []);

  const thisMonday = mondayOf(new Date());
  const nextMonday = addDays(thisMonday, 7);
  const week = (monday) => menus?.find((m) => m.kind === "week" && m.start_date === toIso(monday));
  const weeks = (menus ?? []).filter((m) => m.kind === "week");
  const events = (menus ?? []).filter((m) => m.kind === "event");

  return (
    <>
      <PageHeader title="Meniu" subtitle="Planifică mesele săptămânii sau un eveniment">
        <Link to="/meniu/nou?tip=eveniment" className="flex h-11 items-center gap-2 rounded-2xl bg-accent px-4 font-semibold text-on-accent">
          <Plus size={18} aria-hidden="true" /> Eveniment nou
        </Link>
      </PageHeader>
      {error && <p className="text-[var(--accent-red)]">{error}</p>}
      {menus && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <WeekCard label="Săptămâna aceasta" monday={thisMonday} menu={week(thisMonday)} />
            <WeekCard label="Săptămâna viitoare" monday={nextMonday} menu={week(nextMonday)} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-card">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <PartyPopper size={20} className="text-accent" aria-hidden="true" /> Evenimente
              </h2>
              {events.length ? (
                <ul>{events.map((m) => <MenuRow key={m.id} menu={m} />)}</ul>
              ) : (
                <p className="text-muted">Niciun eveniment încă. De exemplu: Crăciun, Paște, o zi de naștere.</p>
              )}
            </section>
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-card">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <CalendarDays size={20} className="text-accent" aria-hidden="true" /> Meniuri săptămânale
              </h2>
              {weeks.length ? <ul>{weeks.map((m) => <MenuRow key={m.id} menu={m} />)}</ul> : <p className="text-muted">Niciun meniu săptămânal încă.</p>}
            </section>
          </div>
        </>
      )}
    </>
  );
}
