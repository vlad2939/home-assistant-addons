import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { photoUrl } from "../format.js";

/**
 * Pozele rețetei pe tot ecranul: săgeți / glisare pentru următoarea, ESC sau ✕ pentru ieșire.
 * Doar pentru vizualizare: pozele se adaugă, se șterg și se aleg la Editează.
 * images: [{ photo, galleryId? }] – prima poate fi poza principală (fără galleryId).
 */
export default function PhotoLightbox({ images, index, onIndex, onClose }) {
  const touch = useRef(null);
  const total = images.length;
  const current = images[index];
  const go = (delta) => onIndex((index + delta + total) % total);

  const state = useRef({});
  state.current = { go, onClose };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") state.current.go(1);
      else if (e.key === "ArrowLeft") state.current.go(-1);
      else if (e.key === "Escape") state.current.onClose();
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  if (!current) return null;

  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 60 && total > 1) go(dx < 0 ? 1 : -1);
  };

  const arrow = "absolute top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60";

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in" role="dialog" aria-modal="true" aria-label="Galerie foto">
      <header className="flex shrink-0 items-center gap-2 p-3 text-white">
        <span className="flex-1 pl-2 text-sm tabular-nums text-white/70">
          {index + 1} / {total}
          {!current.galleryId && " · poza principală"}
        </span>
        <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-white/10" aria-label="Închide">
          <X size={26} />
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <img
          key={current.photo}
          src={photoUrl(current.photo)}
          alt=""
          className="max-h-full max-w-full select-none rounded-xl object-contain animate-fade-in"
          draggable={false}
        />
        {total > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${arrow} left-3`} aria-label="Poza anterioară">
              <ChevronLeft size={30} />
            </button>
            <button type="button" onClick={() => go(1)} className={`${arrow} right-3`} aria-label="Poza următoare">
              <ChevronRight size={30} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
