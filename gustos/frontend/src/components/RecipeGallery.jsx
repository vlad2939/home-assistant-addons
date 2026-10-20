import { useRef, useState } from "react";
import { Camera, ImagePlus, Images, Star, X } from "lucide-react";
import { api } from "../api.js";
import { photoUrl } from "../format.js";

/**
 * Galeria foto a rețetei.
 *  - pe pagina rețetei (fără onGallery): doar miniaturi; un click le deschide pe tot ecranul;
 *  - la Editează (cu onGallery): adăugare (mai multe odată sau din cameră), ștergere, alegerea pozei principale.
 */
export default function RecipeGallery({ recipe, onGallery, onOpen, onDelete, onMakeCover, note }) {
  const editable = Boolean(onGallery);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [errors, setErrors] = useState([]);
  const offset = recipe.photo ? 1 : 0; // în galeria pe tot ecranul, poza principală e prima

  const addFiles = async (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setUploading(files.length);
    setErrors([]);
    try {
      const result = await api.uploadMany(`/api/recipes/${recipe.id}/gallery`, files);
      onGallery(result.gallery);
      setErrors(result.errors);
    } catch (e) {
      setErrors([e.message]);
    } finally {
      setUploading(0);
      if (fileInput.current) fileInput.current.value = "";
      if (cameraInput.current) cameraInput.current.value = "";
    }
  };

  const action = "flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2 disabled:opacity-50";
  const overlay =
    "absolute top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-text shadow-card";

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Images size={22} className="text-accent" aria-hidden="true" /> Galerie foto
          {recipe.gallery.length > 0 && <span className="text-base font-normal text-muted">({recipe.gallery.length})</span>}
        </h2>
        {editable && (
          <div className="flex gap-2">
            <button type="button" onClick={() => cameraInput.current?.click()} disabled={uploading > 0} className={action}>
              <Camera size={18} aria-hidden="true" /> Fă o poză
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading > 0} className={action}>
              <ImagePlus size={18} aria-hidden="true" /> Adaugă poze
            </button>
            <input ref={fileInput} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
          </div>
        )}
      </div>

      {note && <p className="mb-3 text-sm text-muted">{note}</p>}
      {editable && recipe.gallery.length === 0 && !uploading && (
        <p className="text-muted">Adaugă mai multe poze: pașii importanți, rezultatul, cum ai servit-o. Poți alege mai multe poze odată.</p>
      )}
      {uploading > 0 && (
        <p className="mb-3 text-muted" aria-live="polite">
          Se încarcă {uploading === 1 ? "poza" : `${uploading} poze`}…
        </p>
      )}
      {recipe.gallery.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {recipe.gallery.map((g, i) => (
            <li key={g.id} className="relative">
              <button
                type="button"
                onClick={() => onOpen?.(i + offset)}
                className={`block aspect-square w-full overflow-hidden rounded-2xl bg-surface-2 ${onOpen ? "" : "cursor-default"}`}
                aria-label={onOpen ? `Deschide poza ${i + 1}` : `Poza ${i + 1}`}
              >
                <img src={photoUrl(g.photo, { thumb: true })} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
              </button>
              {onMakeCover && (
                <button
                  type="button"
                  onClick={() => onMakeCover(g)}
                  className={`${overlay} left-1.5 hover:text-accent`}
                  aria-label={`Fă poza ${i + 1} poza principală`}
                  title="Fă-o poza principală"
                >
                  <Star size={17} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(g)}
                  className={`${overlay} right-1.5 hover:text-[var(--accent-red)]`}
                  aria-label={`Șterge poza ${i + 1}`}
                  title="Șterge poza"
                >
                  <X size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {errors.map((e) => (
        <p key={e} className="mt-3 text-sm text-[var(--accent-red)]" role="alert">
          {e}
        </p>
      ))}
    </section>
  );
}
