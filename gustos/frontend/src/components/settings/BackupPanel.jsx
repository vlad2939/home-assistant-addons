import { useEffect, useRef, useState } from "react";
import { DownloadCloud, History, UploadCloud } from "lucide-react";
import { api } from "../../api.js";
import { useApp } from "../../AppContext.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { Notice, Section, primaryButton, smallButton } from "./common.jsx";

function formatSafetyName(name) {
  // inainte-de-restaurare-2026-10-19-153012.zip → 19.10.2026, 15:30
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}, ${m[4]}:${m[5]}` : name;
}

function formatSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function BackupPanel() {
  const { refreshCatalog, reloadAppearance } = useApp();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [safety, setSafety] = useState([]);

  const loadSafety = () => api.get("/api/backup/safety").then(setSafety).catch(() => {});
  useEffect(() => {
    loadSafety();
  }, []);

  const pick = (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (chosen) {
      setResult(null);
      setError(null);
      setFile(chosen);
    }
  };

  const restore = async () => {
    try {
      const r = await api.upload("/api/backup/restore", file);
      setResult(r);
      setError(null);
      await refreshCatalog();
      reloadAppearance();
      loadSafety();
    } catch (e) {
      setError(e.message);
    } finally {
      setFile(null);
    }
  };

  return (
    <Section
      title="Backup"
      description="Exportul descarcă un fișier ZIP cu toate rețetele și pozele. Recomandare: un export după fiecare sesiune mare de adăugat rețete."
    >
      <div className="flex flex-wrap gap-3">
        <a href="/api/backup/export" download className={primaryButton}>
          <DownloadCloud size={20} aria-hidden="true" /> Exportă tot
        </a>
        <button type="button" onClick={() => fileRef.current?.click()} className={smallButton}>
          <UploadCloud size={20} aria-hidden="true" /> Restaurează din ZIP
        </button>
        <input ref={fileRef} type="file" accept=".zip,application/zip" className="hidden" onChange={pick} />
      </div>

      {result && (
        <Notice kind="ok">
          Restaurare reușită: {result.recipes} {result.recipes === 1 ? "rețetă" : "rețete"} și {result.photos}{" "}
          {result.photos === 1 ? "poză" : "poze"}. Starea dinainte a fost păstrată ca copie de siguranță.
        </Notice>
      )}
      {error && <Notice kind="error">Restaurarea nu s-a făcut: {error} Datele curente au rămas neschimbate.</Notice>}

      {safety.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
            <History size={16} aria-hidden="true" /> Copii de siguranță făcute automat înainte de restaurare
          </p>
          <ul className="divide-y divide-border text-sm">
            {safety.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {formatSafetyName(s.name)} <span className="text-muted">· {formatSize(s.size)}</span>
                </span>
                <a href={`/api/backup/safety/${s.name}`} download className="font-medium text-accent hover:underline">
                  Descarcă
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(file)}
        onClose={() => setFile(null)}
        onConfirm={restore}
        title="Restaurezi din backup?"
        confirmLabel="Restaurează"
        danger
      >
        <p>
          Toate rețetele, pozele, categoriile și setările actuale vor fi <strong>înlocuite</strong> cu cele din fișierul{" "}
          <strong>{file?.name}</strong>.
        </p>
        <p className="text-muted">
          Înainte de restaurare, starea curentă se salvează automat ca copie de siguranță, pe care o poți descărca de aici.
        </p>
      </ConfirmDialog>
    </Section>
  );
}
