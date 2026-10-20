import { useState } from "react";
import { Link } from "react-router-dom";
import { Languages, Loader2, Undo2 } from "lucide-react";
import { api } from "../../api.js";
import { toForm, toPayload } from "../../recipeForm.js";

const ENGINES = { local: "modelul local (pe NUC)", deepl: "DeepL" };

/**
 * Bara „Tradu în română” pentru rețetele în engleză (în previzualizarea importului și la editare).
 * Traduce textul din formular așa cum este acum; cantitățile, unitățile și poza rămân neschimbate.
 */
export default function TranslatePanel({ form, setForm }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { engine, seconds, warning, original }
  const [error, setError] = useState(null);

  if (form.original_language !== "en" && !done) return null;

  const translate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { payload } = toPayload(form);
      const result = await api.post("/api/translate", { recipe: payload });
      setDone({ engine: result.engine, seconds: result.seconds, warning: result.warning, original: form });
      setForm(toForm(result.recipe));
    } catch (e) {
      setError({ message: e.message, settings: e.status === 409 || e.status === 400 });
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    setForm(done.original);
    setDone(null);
  };

  return (
    <section className="mb-6 rounded-3xl border-2 border-accent bg-surface p-5 shadow-card" aria-live="polite">
      <div className="flex flex-wrap items-center gap-4">
        <Languages size={28} className="shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {done ? (
            <>
              <p className="font-semibold">
                Tradusă în română cu {ENGINES[done.engine] ?? done.engine}, în {String(done.seconds).replace(".", ",")} s.
              </p>
              <p className="text-sm text-muted">Citește textul și corectează ce nu sună bine înainte să salvezi.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Rețeta este în engleză.</p>
              <p className="text-sm text-muted">
                Unitățile sunt deja în sistemul metric (căni, linguri, grame, °C). Traducerea poate dura până la un minut pe NUC.
              </p>
            </>
          )}
        </div>
        {done ? (
          <button
            type="button"
            onClick={undo}
            className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface px-5 font-medium hover:bg-surface-2"
          >
            <Undo2 size={20} aria-hidden="true" /> Revino la textul în engleză
          </button>
        ) : (
          <button
            type="button"
            onClick={translate}
            disabled={busy}
            className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-70"
          >
            {busy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Languages size={20} aria-hidden="true" />}
            {busy ? "Se traduce…" : "Tradu în română"}
          </button>
        )}
      </div>
      {done?.warning && <p className="mt-3 text-sm text-[var(--accent-orange)]">{done.warning}</p>}
      {error && (
        <p className="mt-3 text-sm text-[var(--accent-red)]" role="alert">
          {error.message}{" "}
          {error.settings && (
            <Link to="/setari" className="font-medium text-accent hover:underline">
              Mergi la Setări
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
