// Aplicarea temei pe <html>. Alegerea e salvată pe server; o copie locală evită „clipirea” la pornire.

export const THEMES = [
  { id: "auto", label: "Automat" },
  { id: "light", label: "Luminos" },
  { id: "dark", label: "Întunecat" },
];

export const ACCENTS = [
  { id: "orange", label: "Portocaliu" },
  { id: "red", label: "Roșu" },
  { id: "green", label: "Verde" },
  { id: "blue", label: "Albastru" },
  { id: "purple", label: "Mov" },
];

const STORAGE_KEY = "gustos-appearance";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function applyAppearance({ theme = "auto", accent = "orange" }) {
  const root = document.documentElement;
  // paginile de tipar / PDF sunt mereu luminoase (data-printing pus de PrintLayout)
  const resolved = root.dataset.printing ? "light" : theme === "auto" ? (darkQuery.matches ? "dark" : "light") : theme;
  root.dataset.theme = resolved;
  root.dataset.accent = accent;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent }));
  } catch {
    // stocarea locală poate lipsi (mod privat) – nu e o problemă
  }
}

/** Reaplică tema salvată (după ce se închide o pagină de tipar). */
export function reapplyStoredAppearance() {
  try {
    applyAppearance(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
  } catch {
    applyAppearance({});
  }
}

export function onSystemThemeChange(callback) {
  darkQuery.addEventListener("change", callback);
  return () => darkQuery.removeEventListener("change", callback);
}
