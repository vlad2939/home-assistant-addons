import { NavLink, Link } from "react-router-dom";
import { Download, House, Menu, PlusCircle, Settings, UtensilsCrossed } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Acasă", icon: House, end: true },
  { to: "/retete", label: "Rețete", icon: UtensilsCrossed },
  { to: "/adauga", label: "Adaugă", icon: PlusCircle },
  { to: "/import", label: "Import", icon: Download },
  { to: "/setari", label: "Setări", icon: Settings },
];

export default function TopBar({ onLogoClick, onMenuClick }) {
  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 lg:gap-4 lg:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-xl p-2.5 text-muted hover:bg-surface-2 hover:text-text lg:hidden"
        aria-label="Categorii"
      >
        <Menu size={24} />
      </button>

      <button type="button" onClick={onLogoClick} className="shrink-0 rounded-xl" aria-label="Arată logo-ul">
        <img src="/logo-small.webp" alt="" className="h-11 w-11 rounded-xl" />
      </button>
      <Link to="/" className="mr-2 hidden text-xl font-semibold tracking-tight sm:block">
        Gustos
      </Link>

      <nav className="ml-auto flex items-center gap-1 lg:ml-4" aria-label="Module">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-[15px] font-medium transition-colors lg:px-3.5 ${
                isActive ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-text"
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
