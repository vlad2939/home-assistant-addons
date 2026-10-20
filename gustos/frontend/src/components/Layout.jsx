import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import TopBar from "./TopBar.jsx";
import SideBar from "./SideBar.jsx";
import LogoLightbox from "./LogoLightbox.jsx";
import { armFullscreenAtStart } from "../screen.js";

/** Mențiunea de autor, la baza panoului cu categorii. */
function Copyright() {
  return (
    <footer className="mx-3 mt-auto border-t border-border px-3 pb-4 pt-4 text-xs text-muted">© concept și realizare vlad39</footer>
  );
}

export default function Layout() {
  const [logoOpen, setLogoOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Setarea „Pornește în ecran complet”: se aplică la prima atingere (cerința browserelor).
  useEffect(() => armFullscreenAtStart(), []);

  // Panoul de categorii (tabletă portret) se închide la navigare și cu ESC.
  useEffect(() => setDrawerOpen(false), [location]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="flex h-full flex-col">
      <TopBar onLogoClick={() => setLogoOpen(true)} onMenuClick={() => setDrawerOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface lg:flex">
          <SideBar />
          <Copyright />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto" id="continut">
          <div className="mx-auto max-w-6xl p-5 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-md animate-fade-in lg:hidden"
          style={{ background: "var(--overlay)" }}
          onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        >
          <aside className="flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-surface shadow-card">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Închide categoriile"
              >
                <X size={22} />
              </button>
            </div>
            <SideBar onNavigate={() => setDrawerOpen(false)} />
            <Copyright />
          </aside>
        </div>
      )}

      <LogoLightbox open={logoOpen} onClose={() => setLogoOpen(false)} />
    </div>
  );
}
