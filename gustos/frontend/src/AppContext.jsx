import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { applyAppearance, onSystemThemeChange } from "./theme.js";

const AppContext = createContext(null);

function readLocalAppearance() {
  try {
    return JSON.parse(localStorage.getItem("gustos-appearance")) || {};
  } catch {
    return {};
  }
}

export function AppProvider({ children }) {
  const [appearance, setAppearance] = useState(() => ({ theme: "auto", accent: "orange", ...readLocalAppearance() }));
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);

  // Tema: aplicată la fiecare schimbare și când sistemul trece pe dark/light (pentru „Automat”).
  useEffect(() => {
    applyAppearance(appearance);
    return onSystemThemeChange(() => applyAppearance(appearance));
  }, [appearance]);

  // Tema salvată pe server (reîncărcată și după o restaurare din backup).
  const reloadAppearance = useCallback(() => {
    api.get("/api/settings").then((s) => setAppearance({ theme: s.theme, accent: s.accent })).catch(() => {});
  }, []);

  useEffect(reloadAppearance, [reloadAppearance]);

  const updateAppearance = useCallback(async (change) => {
    setAppearance((current) => ({ ...current, ...change })); // instant, apoi salvare pe server
    const saved = await api.put("/api/settings", change);
    setAppearance({ theme: saved.theme, accent: saved.accent });
  }, []);

  // Categoriile și numerele din SideBar; paginile apelează refreshCatalog() după modificări.
  const refreshCatalog = useCallback(async () => {
    const [cats, st] = await Promise.all([api.get("/api/categories"), api.get("/api/stats")]);
    setCategories(cats);
    setStats(st);
  }, []);

  useEffect(() => {
    refreshCatalog().catch(() => {});
  }, [refreshCatalog]);

  return (
    <AppContext.Provider value={{ appearance, updateAppearance, reloadAppearance, categories, stats, refreshCatalog }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
