import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { CalendarDays, Download, House, Maximize, Menu, Minimize, Moon, PlusCircle, Settings, ShoppingCart, Sun, UtensilsCrossed } from "lucide-react";
import { useApp } from "../AppContext.jsx";
import { exitFullscreen, enterFullscreen, fullscreenSupported } from "../screen.js";

// main: textul se vede și pe tabletă; celelalte au text doar pe ecranele late (de la 1280 px)
export const NAV_ITEMS = [
  { to: "/", label: "Acasă", icon: House, end: true, main: true },
  { to: "/retete", label: "Rețete", icon: UtensilsCrossed, main: true },
  { to: "/adauga", label: "Adaugă", icon: PlusCircle, main: true },
  { to: "/import", label: "Import", icon: Download, main: true },
  { to: "/meniu", label: "Meniu", icon: CalendarDays },
  { to: "/cumparaturi", label: "Cumpărături", icon: ShoppingCart },
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
  const supported = fullscreenSupported();
  const [active, setActive] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;
  const toggle = () => (document.fullscreenElement ? exitFullscreen() : enterFullscreen());
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
      <Link to="/" className="shimmer-text mr-2 hidden text-[1.625rem] font-semibold leading-none tracking-tight sm:block">
        Gustos
      </Link>

      <nav className="ml-auto flex items-center gap-0.5 lg:ml-4 lg:gap-1" aria-label="Module">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, main }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-xl px-2 py-2.5 text-[15px] font-medium transition-colors lg:gap-2 lg:px-3.5 ${
                isActive ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-text"
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span className={main ? "" : "hidden xl:inline"}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-1 border-l border-border pl-2 lg:ml-auto lg:border-l-0 lg:pl-0">
        <FullscreenButton />
        <ThemeButton />
      </div>
    </header>
  );
}
