import { Link, useLocation } from "react-router-dom";
import { BadgeCheck, Heart, LayoutGrid } from "lucide-react";
import { useApp } from "../AppContext.jsx";

function Item({ to, active, icon: Icon, label, count, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
        active ? "bg-accent-soft font-medium text-accent-strong" : "hover:bg-surface-2"
      }`}
    >
      {Icon && <Icon size={18} className={active ? "" : "text-muted"} aria-hidden="true" />}
      <span className="flex-1 truncate">{label}</span>
      {count != null && <span className={`text-sm tabular-nums ${active ? "" : "text-muted"}`}>{count}</span>}
    </Link>
  );
}

export default function SideBar({ onNavigate }) {
  const { categories, stats } = useApp();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const onList = pathname === "/retete";
  const activeCategory = onList ? params.get("categorie") : null;
  const favorites = onList && params.get("favorite") === "1";
  const mine = onList && params.get("ale-mele") === "1";

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Categorii">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Categorii</p>
      <Item
        to="/retete"
        label="Toate"
        icon={LayoutGrid}
        count={stats?.recipes}
        active={onList && !activeCategory && !favorites && !mine}
        onNavigate={onNavigate}
      />
      <Item
        to="/retete?favorite=1"
        label="Favorite"
        icon={Heart}
        count={stats?.favorites}
        active={favorites}
        onNavigate={onNavigate}
      />
      <Item
        to="/retete?ale-mele=1"
        label="Rețetele mele"
        icon={BadgeCheck}
        count={stats?.own}
        active={mine}
        onNavigate={onNavigate}
      />
      <hr className="mx-3 my-2 border-border" />
      {categories.map((c) => (
        <Item
          key={c.id}
          to={`/retete?categorie=${c.id}`}
          label={c.name}
          count={c.recipe_count}
          active={activeCategory === String(c.id)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
