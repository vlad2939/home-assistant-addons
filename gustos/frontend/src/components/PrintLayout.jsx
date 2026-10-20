import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { reapplyStoredAppearance } from "../theme.js";

/**
 * Pagină de tipar (rețetă, meniu, listă de cumpărături): A4, mereu în tema luminoasă, fără bara de sus.
 * Când totul (inclusiv pozele) s-a încărcat, se deschide fereastra de tipărire a browserului,
 * unde se alege „Salvează ca PDF”. Titlul documentului devine numele fișierului PDF.
 */
export default function PrintLayout({ title, ready, children }) {
  const navigate = useNavigate();
  const printed = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const previousTitle = document.title;
    root.dataset.printing = "1";
    root.dataset.theme = "light";
    return () => {
      delete root.dataset.printing;
      reapplyStoredAppearance();
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  useEffect(() => {
    if (!ready || printed.current) return undefined;
    printed.current = true;
    const images = [...document.querySelectorAll(".print-page img")];
    const whenLoaded = (img) =>
      new Promise((done) => {
        if (img.complete) return done();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    const loaded = Promise.all(images.map(whenLoaded));
    let cancelled = false;
    Promise.race([loaded, new Promise((done) => setTimeout(done, 4000))]).then(() => !cancelled && window.print());
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));

  return (
    <div className="min-h-full bg-surface-2 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
        <button type="button" onClick={back} className="flex h-11 items-center gap-2 rounded-2xl px-3 font-medium text-muted hover:bg-surface-2 hover:text-text">
          <ArrowLeft size={20} aria-hidden="true" /> Înapoi
        </button>
        <p className="hidden text-sm text-muted md:block">În fereastra de tipărire alege „Salvează ca PDF” sau imprimanta.</p>
        <button type="button" onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent">
          <Printer size={20} aria-hidden="true" /> Salvează PDF / Tipărește
        </button>
      </div>
      <div className="print-page mx-auto my-6 max-w-[210mm] bg-white p-[14mm] text-[#221e1a] shadow-card print:m-0 print:max-w-none print:p-0 print:shadow-none">
        {ready ? children : <p className="text-muted">Se pregătește…</p>}
        <footer className="mt-8 border-t border-[#e2dcd3] pt-3 text-center text-xs text-[#6e665d]">
          Gustos · © concept și realizare vlad39
        </footer>
      </div>
    </div>
  );
}
