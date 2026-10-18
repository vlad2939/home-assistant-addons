import { useEffect, useState } from "react";
import { marked } from "marked";
import Modal from "./Modal.jsx";

// Manualul este un fișier al aplicației (manual_utilizare.md), nu conținut venit din afară,
// deci HTML-ul generat din el poate fi afișat direct.
export default function ManualModal({ open, onClose }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || html) return;
    fetch("/api/manual")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.text();
      })
      // primul titlu e deja în antetul ferestrei
      .then((text) => setHtml(marked.parse(text.replace(/^# .*\n/, ""))))
      .catch(() => setError("Manualul nu s-a putut încărca. Verifică dacă serverul rulează."));
  }, [open, html]);

  return (
    <Modal open={open} onClose={onClose} title="Manual de utilizare" wide>
      {error && <p>{error}</p>}
      {!html && !error && <p className="text-muted">Se încarcă…</p>}
      {html && <div className="manual" dangerouslySetInnerHTML={{ __html: html }} />}
    </Modal>
  );
}
