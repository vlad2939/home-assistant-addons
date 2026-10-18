import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Download, House, Maximize, Menu, Minimize, Moon, PlusCircle, Settings, Sun, UtensilsCrossed } from "lucide-react";
import { useApp } from "../AppContext.jsx";

export const NAV_ITEMS = [
  { to: "/", label: "Acasă", icon: House, end: true },
  { to: "/retete", label: "Rețete", icon: UtensilsCrossed },
  { to: "/adauga", label: "Adaugă", icon: PlusCircle },
  { to: "/import", label: "Import", icon: Download },
  { to: "/setari", label: "Setări", icon: Settings },
];

const toolButton = "flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-text";

/** Tema afișată acum (light / dark), inclusiv când în Setări este „Automat”. */
function useShownTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** Ecran complet (ca F11). Butonul lipsește dacă browserul nu permite. */
function FullscreenButton() {
  const supported = Boolean(document.documentElement.requestFullscreen);
  const [active, setActive] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;
  const toggle = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  const label = active ? "Ieși din ecran complet" : "Ecran complet";
  return (
    <button type="button" onClick={toggle} className={toolButton} aria-label={label} title={label}>
      {active ? <Minimize size={21} /> : <Maximize size={21} />}
    </button>
  );
}

function ThemeButton() {
  const { updateAppearance } = useApp();
  const shown = useShownTheme();
  const next = shown === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Temă întunecată" : "Temă luminoasă";
  return (
    <button type="button" onClick={() => updateAppearance({ theme: next }).catch(() => {})} className={toolButton} aria-label={label} title={label}>
      {next === "dark" ? <Moon size={21} /> : <Sun size={21} />}
    </button>
  );
}

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
            title={label}
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

      <div className="flex items-center gap-1 border-l border-border pl-2 lg:ml-auto lg:border-l-0 lg:pl-0">
        <ThemeButton />
        <FullscreenButton />
      </div>
    </header>
  );
}
