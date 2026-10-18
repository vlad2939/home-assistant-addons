import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, ImagePlus, Trash2, Undo2 } from "lucide-react";
import { photoUrl } from "../../format.js";
import { FormSection } from "./fields.jsx";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Alegerea pozei: din fișiere sau direct cu camera (tabletă). Poza se trimite la server abia la „Salvează”.
 * value: { mode: "keep" | "new" | "remove" | "remote", file, url }  („remote” = poza găsită la import)
 */
export default function PhotoPicker({ currentPhoto, value, onChange }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (value.mode !== "new" || !value.file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(value.file);
    setPreview(url);
    setPreviewFailed(false);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite alegerea aceluiași fișier din nou
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Poza este prea mare (maximum 15 MB).");
      return;
    }
    setError(null);
    onChange({ mode: "new", file });
  };

  const shownCurrent = value.mode === "keep" && currentPhoto;
  const remote = value.mode === "remote";
  const src = value.mode === "new" ? preview : remote ? value.url : shownCurrent ? photoUrl(currentPhoto) : null;

  return (
    <FormSection title="Poză">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-accent-soft text-accent md:w-72">
          {src && !previewFailed ? (
            <img
              src={src}
              alt="Previzualizare poză"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
            />
          ) : value.mode === "new" ? (
            <div className="p-4 text-center text-sm">
              <ImageIcon size={36} className="mx-auto mb-2" aria-hidden="true" />
              {value.file.name}
              <span className="block text-muted">(previzualizarea nu e disponibilă pentru acest format)</span>
            </div>
          ) : (
            <ImagePlus size={44} strokeWidth={1.4} aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2">
              <ImagePlus size={20} aria-hidden="true" /> {src ? "Altă poză" : "Alege poză"}
            </button>
            <button type="button" onClick={() => cameraRef.current?.click()} className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2">
              <Camera size={20} aria-hidden="true" /> Fă o poză
            </button>
            {(shownCurrent || value.mode === "new" || remote) && (
              <button
                type="button"
                onClick={() => onChange(value.mode === "new" || remote ? { mode: "keep" } : { mode: "remove" })}
                className="flex h-12 items-center gap-2 rounded-2xl px-4 font-medium text-[var(--accent-red)] hover:bg-surface-2"
              >
                <Trash2 size={20} aria-hidden="true" />{" "}
                {remote ? "Fără poza de pe site" : value.mode === "new" && currentPhoto ? "Renunță la poza nouă" : "Elimină poza"}
              </button>
            )}
            {value.mode === "remove" && (
              <button type="button" onClick={() => onChange({ mode: "keep" })} className="flex h-12 items-center gap-2 rounded-2xl px-4 font-medium text-accent hover:bg-surface-2">
                <Undo2 size={20} aria-hidden="true" /> Păstrează poza
              </button>
            )}
          </div>
          <p className="text-sm text-muted">JPG, PNG, WebP sau HEIC, maximum 15 MB. Orientarea se corectează automat.</p>
          {value.mode === "remove" && <p className="text-sm text-muted">Poza va fi eliminată la salvare.</p>}
          {remote && <p className="text-sm text-muted">Poza de pe site se descarcă pe server la salvare.</p>}
          {error && (
            <p className="text-sm text-[var(--accent-red)]" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={pick} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
    </FormSection>
  );
}
