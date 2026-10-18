import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Download, Link2, RotateCcw, Save } from "lucide-react";
import { api } from "../api.js";
import { useApp } from "../AppContext.jsx";
import { toForm, toPayload } from "../recipeForm.js";
import { saveRecipe } from "./RecipeEditPage.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import RecipeForm from "../components/form/RecipeForm.jsx";
import UnsavedChangesGuard from "../components/form/UnsavedChangesGuard.jsx";

function SiteList({ sites }) {
  if (!sites.length) return null;
  return (
    <p className="mt-3 text-sm text-muted">
      Site-uri permise:{" "}
      {sites
        .filter((s) => s.active)
        .map((s) => s.domain)
        .join(", ")}
      .
    </p>
  );
}

export default function ImportPage() {
  const navigate = useNavigate();
  const { refreshCatalog } = useApp();
  const [url, setUrl] = useState("");
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { warnings, duplicates, sourceUrl }
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState({ mode: "keep" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  useEffect(() => {
    api.get("/api/import-sites").then(setSites).catch(() => {});
  }, []);

  useEffect(() => {
    if (saved) navigate(`/reteta/${saved.id}`, { replace: true, state: saved.notice ? { notice: saved.notice } : null });
  }, [saved, navigate]);

  const runImport = async (e) => {
    e.preventDefault();
    const link = url.trim();
    if (!link) return;
    setLoading(true);
    setError(null);
    try {
      const { draft, duplicates } = await api.post("/api/import/preview", { url: link });
      setForm(toForm(draft));
      setPhoto(draft.image_url ? { mode: "remote", url: draft.image_url } : { mode: "keep" });
      setResult({ warnings: draft.warnings, duplicates, site: draft.source_site, language: draft.original_language });
      setErrors({});
      setMessage(null);
    } catch (err) {
      setError({ message: err.message, notAllowed: err.status === 403 });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(null);
    setResult(null);
    setPhoto({ mode: "keep" });
    setUrl("");
  };

  const save = async () => {
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
      const r = await saveRecipe({ id: null, payload: { ...payload, source_site: result.site, original_language: result.language }, photo });
      refreshCatalog();
      setSaved({ id: r.id, notice: r.photoError && `Rețeta a fost salvată, dar poza nu: ${r.photoError}` });
    } catch (err) {
      setMessage(err.message);
      setSaving(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (result?.duplicates.length) setConfirmDuplicate(true);
    else save();
  };

  if (!form) {
    return (
      <>
        <PageHeader title="Import din link" subtitle="Lipește linkul unei rețete de pe un site permis. Nimic nu se salvează până nu apeși „Salvează”." />
        <form onSubmit={runImport} className="rounded-3xl border border-border bg-surface p-5 shadow-card lg:p-6">
          <label htmlFor="import-url" className="mb-2 block font-medium">
            Linkul rețetei
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Link2 size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="import-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                autoFocus
                className="h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 text-lg outline-none placeholder:text-muted focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-on-accent disabled:opacity-50"
            >
              <Download size={20} aria-hidden="true" /> {loading ? "Se citește rețeta…" : "Importă"}
            </button>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-[var(--accent-red)] p-4" role="alert">
              <p>{error.message}</p>
              {error.notAllowed && (
                <Link to="/setari" className="mt-2 inline-block font-medium text-accent hover:underline">
                  Mergi la Setări
                </Link>
              )}
            </div>
          )}
          <SiteList sites={sites} />
        </form>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Previzualizare import" subtitle={`Verifică și corectează rețeta de pe ${result.site}, apoi salveaz-o.`}>
        <button type="button" onClick={reset} className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2">
          <RotateCcw size={18} aria-hidden="true" /> Alt link
        </button>
      </PageHeader>

      {(result.warnings.length > 0 || result.duplicates.length > 0) && (
        <div className="mb-6 space-y-2 rounded-3xl border border-[var(--accent-orange)] bg-surface p-5">
          {result.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--accent-orange)]" aria-hidden="true" /> {w}
            </p>
          ))}
          {result.duplicates.map((d) => (
            <p key={d.id} className="flex items-start gap-2">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--accent-orange)]" aria-hidden="true" />
              <span>
                Acest link a mai fost importat:{" "}
                <Link to={`/reteta/${d.id}`} className="font-medium text-accent hover:underline">
                  {d.title}
                </Link>
              </span>
            </p>
          ))}
        </div>
      )}

      <RecipeForm form={form} setForm={setForm} photo={photo} setPhoto={setPhoto} currentPhoto={null} errors={errors} />

      <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-bg/90 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        {message && (
          <p className="mr-auto text-[var(--accent-red)]" role="alert">
            {message}
          </p>
        )}
        <button type="button" onClick={reset} className="h-12 rounded-2xl border border-border bg-surface px-5 font-medium hover:bg-surface-2">
          Renunță
        </button>
        <button type="submit" disabled={saving} className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-on-accent disabled:opacity-60">
          <Save size={20} aria-hidden="true" /> {saving ? (photo.mode === "remote" ? "Se descarcă poza…" : "Se salvează…") : "Salvează rețeta"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDuplicate}
        onClose={() => setConfirmDuplicate(false)}
        onConfirm={async () => {
          setConfirmDuplicate(false);
          await save();
        }}
        title="Rețeta există deja"
        confirmLabel="Salvează oricum"
      >
        <p>Acest link a mai fost importat. Dacă salvezi, vei avea două rețete la fel.</p>
      </ConfirmDialog>

      <UnsavedChangesGuard when={!saving && !saved} />
    </form>
  );
}
