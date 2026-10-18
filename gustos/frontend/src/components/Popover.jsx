import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Buton cu panou derulant; se închide la click în afară și cu ESC. */
export default function Popover({ label, active = false, children, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex h-11 items-center gap-2 rounded-2xl border px-4 font-medium transition-colors ${
          active ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface hover:bg-surface-2"
        }`}
      >
        {label}
        <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-2 max-h-80 min-w-60 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-card animate-fade-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
