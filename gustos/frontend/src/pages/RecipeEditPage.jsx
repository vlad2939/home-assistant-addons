import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";
import { api } from "../api.js";
import { useApp } from "../AppContext.jsx";
import { emptyForm, formSignature, toForm, toPayload } from "../recipeForm.js";
import PageHeader from "../components/PageHeader.jsx";
import TranslatePanel from "../components/form/TranslatePanel.jsx";
import RecipeForm from "../components/form/RecipeForm.jsx";
import UnsavedChangesGuard from "../components/form/UnsavedChangesGuard.jsx";

/** Salvează rețeta și poza. Returnează { id, photoError }; poza greșită nu pierde rețeta. */
export async function saveRecipe({ id, payload, photo }) {
  const saved = id ? await api.put(`/api/recipes/${id}`, payload) : await api.post("/api/recipes", payload);
  let photoError = null;
  try {
    if (photo.mode === "new") await api.upload(`/api/recipes/${saved.id}/photo`, photo.file);
    else if (photo.mode === "remote") await api.post(`/api/recipes/${saved.id}/photo-from-url`, { url: photo.url });
    else if (photo.mode === "remove") await api.del(`/api/recipes/${saved.id}/photo`);
  } catch (e) {
    photoError = e.message;
  }
  return { id: saved.id, photoError };
}

export default function RecipeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshCatalog } = useApp();
  const [form, setForm] = useState(() => (id ? null : emptyForm()));
  const [initialSignature, setInitialSignature] = useState(() => (id ? null : formSignature(emptyForm())));
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [photo, setPhoto] = useState({ mode: "keep" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/recipes/${id}`)
      .then((recipe) => {
        const f = toForm(recipe);
        setForm(f);
        setInitialSignature(formSignature(f));
        setCurrentPhoto(recipe.photo);
      })
      .catch((e) => setLoadError(e.message));
  }, [id]);

  const dirty = Boolean(form) && !saved && (photo.mode !== "keep" || formSignature(form) !== initialSignature);

  // După salvare, navigarea se face abia când avertizarea s-a dezactivat.
  useEffect(() => {
    if (saved) navigate(`/reteta/${saved.id}`, { replace: true, state: saved.photoError ? { notice: saved.photoError } : null });
  }, [saved, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const { payload, errors: found } = toPayload(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage("Corectează câmpurile marcate cu roșu.");
      requestAnimationFrame(() => document.querySelector("[aria-invalid=true]")?.focus());
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveRecipe({ id, payload, photo });
      refreshCatalog();
      setSaved({
        id: result.id,
        photoError: result.photoError && `Rețeta a fost salvată, dar poza nu: ${result.photoError}`,
      });
    } catch (err) {
      setMessage(err.message);
      setSaving(false);
    }
  };

  if (loadError) return <PageHeader title="Rețeta nu s-a putut încărca" subtitle={loadError} />;
  if (!form) return <p className="text-muted">Se încarcă…</p>;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title={id ? "Editează rețeta" : "Adaugă rețetă"} subtitle="Câmpurile marcate cu * sunt obligatorii." />

      <TranslatePanel form={form} setForm={setForm} />

      <RecipeForm form={form} setForm={setForm} photo={photo} setPhoto={setPhoto} currentPhoto={currentPhoto} errors={errors} />

      <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-bg/90 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        {message && (
          <p className="mr-auto text-[var(--accent-red)]" role="alert">
            {message}
          </p>
        )}
        <button type="button" onClick={() => navigate(-1)} className="h-12 rounded-2xl border border-border bg-surface px-5 font-medium hover:bg-surface-2">
          Anulează
        </button>
        <button type="submit" disabled={saving} className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-on-accent disabled:opacity-60">
          <Save size={20} aria-hidden="true" /> {saving ? (photo.mode === "new" ? "Se încarcă poza…" : "Se salvează…") : "Salvează rețeta"}
        </button>
      </div>

      <UnsavedChangesGuard when={dirty && !saving} />
    </form>
  );
}
