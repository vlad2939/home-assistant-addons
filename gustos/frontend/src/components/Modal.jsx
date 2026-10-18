import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Modal comun: fundal blurat în tonul temei, se închide cu ESC și cu click pe fundal.
 *  - title: titlul din antet (lipsește la variantele fără text, ex. lightbox)
 *  - bare: fără panou și fără antet; conținutul se afișează direct peste fundal
 *  - closeOnContentClick: orice click închide (lightbox)
 */
export default function Modal({ open, onClose, title, children, bare = false, closeOnContentClick = false, wide = false }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onBackdrop = (e) => {
    if (closeOnContentClick || e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-xl animate-fade-in"
      style={{ background: "var(--overlay)" }}
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Fereastră"}
    >
      {bare ? (
        <div ref={panelRef} tabIndex={-1} className="outline-none animate-pop-in">
          {children}
        </div>
      ) : (
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card outline-none animate-pop-in ${
            wide ? "max-w-3xl" : "max-w-lg"
          }`}
        >
          <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"
              aria-label="Închide"
            >
              <X size={22} />
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      )}
    </div>,
    document.body,
  );
}
