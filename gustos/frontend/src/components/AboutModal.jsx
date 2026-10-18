import { useEffect, useState } from "react";
import { api } from "../api.js";
import Modal from "./Modal.jsx";

export default function AboutModal({ open, onClose }) {
  const [about, setAbout] = useState(null);

  useEffect(() => {
    if (open && !about) api.get("/api/about").then(setAbout).catch(() => {});
  }, [open, about]);

  return (
    <Modal open={open} onClose={onClose} title="Despre">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/logo.webp" alt="Logo Gustos" className="h-32 w-32 rounded-3xl shadow-card" />
        <div>
          <p className="text-2xl font-semibold">Gustos</p>
          {about && <p className="text-muted">Versiunea {about.version}</p>}
        </div>
        <p>{about?.description ?? "Aplicație web pentru gestionarea rețetelor culinare."}</p>
        {about && (
          <div className="w-full rounded-2xl bg-surface-2 p-4">
            <p className="mb-2 text-sm font-medium text-muted">Tehnologii folosite</p>
            <div className="flex flex-wrap justify-center gap-2">
              {about.technologies.map((t) => (
                <span key={t} className="rounded-full bg-surface px-3 py-1 text-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-muted">© concept și realizare vlad39</p>
      </div>
    </Modal>
  );
}
