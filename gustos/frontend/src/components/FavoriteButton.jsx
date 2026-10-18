import { useState } from "react";
import { Heart } from "lucide-react";
import { api } from "../api.js";
import { useApp } from "../AppContext.jsx";

/** Inimă de favorit: comută pe server, actualizează numerele din SideBar. */
export default function FavoriteButton({ recipeId, favorite, onChange, className = "" }) {
  const { refreshCatalog } = useApp();
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.post(`/api/recipes/${recipeId}/favorite`);
      onChange?.(result.favorite);
      refreshCatalog();
    } catch {
      // fără schimbare dacă serverul nu răspunde
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      aria-label={favorite ? "Scoate din favorite" : "Adaugă la favorite"}
      title={favorite ? "Scoate din favorite" : "Adaugă la favorite"}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90 ${className}`}
    >
      <Heart
        size={22}
        strokeWidth={2.2}
        className={favorite ? "text-[var(--accent-red)]" : ""}
        fill={favorite ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
