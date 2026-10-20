import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChefHat, ExternalLink, Gauge, Lightbulb, Minus, NotebookPen, Pencil, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { api } from "../api.js";
import { useApp } from "../AppContext.jsx";
import { formatMinutes } from "../format.js";
import { groupIngredients, ingredientAmount } from "../scale.js";
import { OwnBadge, RecipePhoto } from "../components/RecipeCard.jsx";
import FavoriteButton from "../components/FavoriteButton.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import PageHeader from "../components/PageHeader.jsx";
import RecipeVideo from "../components/RecipeVideo.jsx";
import CookMode from "../components/CookMode.jsx";
import { useChecked } from "../useChecked.js";

const MAX_SERVINGS = 100;

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function ServingsControl({ base, servings, setServings }) {
  if (!base) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Users size={18} aria-hidden="true" /> Numărul de porții nu este specificat, cantitățile nu se pot scala.
      </p>
    );
  }
  const btn = "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2 disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 font-medium">
        <Users size={20} className="text-accent" aria-hidden="true" /> Porții
      </span>
      <button type="button" className={btn} onClick={() => setServings(servings - 1)} disabled={servings <= 1} aria-label="Mai puține porții">
        <Minus size={20} />
      </button>
      <span className="min-w-10 text-center text-2xl font-semibold tabular-nums" aria-live="polite">
        {servings}
      </span>
      <button type="button" className={btn} onClick={() => setServings(servings + 1)} disabled={servings >= MAX_SERVINGS} aria-label="Mai multe porții">
        <Plus size={20} />
      </button>
      {servings !== base && (
        <button type="button" onClick={() => setServings(base)} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          <RotateCcw size={15} aria-hidden="true" /> Revino la {base}
        </button>
      )}
    </div>
  );
}

function Ingredients({ recipe, servings, state }) {
  const groups = groupIngredients(recipe.ingredients);
  const { checked, toggle, reset } = state;
  const total = recipe.ingredients.length;
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Ingrediente</h2>
        {checked.size > 0 && (
          <span className="flex items-center gap-3">
            <span className="text-sm text-muted tabular-nums">
              {checked.size}/{total}
            </span>
            <button type="button" onClick={reset} className="text-sm font-medium text-accent hover:underline">
              Debifează tot
            </button>
          </span>
        )}
      </div>
      {total === 0 && <p className="text-muted">Nu sunt trecute ingrediente.</p>}
      <div className="space-y-5">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.name && <h3 className="mb-2 font-semibold text-accent-strong">{g.name}</h3>}
            <ul className="divide-y divide-border">
              {g.items.map((ing) => {
                const amount = ingredientAmount(ing, recipe.servings, servings);
                const done = checked.has(ing.id);
                return (
                  <li key={ing.id}>
                    <button
                      type="button"
                      onClick={() => toggle(ing.id)}
                      aria-pressed={done}
                      className={`-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2 ${
                        done ? "opacity-55" : ""
                      }`}
                    >
                      <CheckMark done={done} />
                      <span className={`w-24 shrink-0 font-semibold tabular-nums ${done ? "line-through" : ""}`}>{amount}</span>
                      <span className={done ? "line-through" : ""}>
                        {ing.name}
                        {ing.note && <span className="text-muted">, {ing.note}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function CheckMark({ done }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
        done ? "border-accent bg-accent text-on-accent" : "border-border"
      }`}
      aria-hidden="true"
    >
      {done && <Check size={14} strokeWidth={3} />}
    </span>
  );
}

function Steps({ recipe, state }) {
  const { checked, toggle, reset } = state;
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Mod de preparare</h2>
        {checked.size > 0 && (
          <button type="button" onClick={reset} className="text-sm font-medium text-accent hover:underline">
            Debifează tot
          </button>
        )}
      </div>
      {recipe.steps.length === 0 && <p className="text-muted">Nu sunt trecuți pași.</p>}
      <ol className="space-y-3">
        {recipe.steps.map((text, i) => {
          const done = checked.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={done}
                className={`flex w-full gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-surface-2 ${done ? "opacity-55" : ""}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
                    done ? "border-accent bg-accent text-on-accent" : "border-accent text-accent"
                  }`}
                >
                  {done ? <Check size={18} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`pt-1.5 leading-relaxed ${done ? "line-through" : ""}`}>{text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TextBlock({ icon: Icon, title, text }) {
  if (!text) return null;
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <Icon size={22} className="text-accent" aria-hidden="true" /> {title}
      </h2>
      <p className="whitespace-pre-line leading-relaxed">{text}</p>
    </section>
  );
}

export default function RecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notice = useLocation().state?.notice;
  const { refreshCatalog } = useApp();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [servings, setServings] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cooking, setCooking] = useState(false);
  const ingredientChecks = useChecked(`gustos-ingredients-${id}`);
  const stepChecks = useChecked(`gustos-steps-${id}`);

  useEffect(() => {
    let cancelled = false;
    setRecipe(null);
    setCooking(false);
    setError(null);
    api
      .get(`/api/recipes/${id}`)
      .then((r) => {
        if (cancelled) return;
        setRecipe(r);
        setServings(r.servings);
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/retete"));

  const remove = async () => {
    await api.del(`/api/recipes/${id}`);
    refreshCatalog();
    navigate("/retete", { replace: true });
  };

  if (error) {
    return (
      <>
        <PageHeader title={error.status === 404 ? "Rețeta nu există" : "Rețeta nu s-a putut încărca"} subtitle={error.message} />
        <Link to="/retete" className="font-medium text-accent hover:underline">
          Înapoi la rețete
        </Link>
      </>
    );
  }
  if (!recipe) return <p className="text-muted">Se încarcă…</p>;

  const tagLink = (t) => `/retete?tag=${encodeURIComponent(t)}`;

  return (
    <article>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={goBack} className="flex items-center gap-2 rounded-xl py-2 pr-3 font-medium text-muted hover:text-text">
          <ArrowLeft size={20} aria-hidden="true" /> Înapoi
        </button>
        <div className="flex items-center gap-2">
          <FavoriteButton
            recipeId={recipe.id}
            favorite={recipe.favorite}
            onChange={(favorite) => setRecipe((r) => ({ ...r, favorite }))}
            className="border border-border bg-surface hover:bg-surface-2"
          />
          <Link
            to={`/editeaza/${recipe.id}`}
            className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium hover:bg-surface-2"
          >
            <Pencil size={18} aria-hidden="true" /> Editează
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-surface px-4 font-medium text-[var(--accent-red)] hover:bg-surface-2"
          >
            <Trash2 size={18} aria-hidden="true" /> Șterge
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-5 rounded-2xl border border-[var(--accent-red)] bg-surface p-4" role="alert">
          {notice}
        </p>
      )}

      {recipe.photo && (
        <RecipePhoto recipe={recipe} thumb={false} className="mb-6 aspect-[16/9] max-h-[460px] w-full rounded-3xl" />
      )}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {recipe.category_name && (
            <Link to={`/retete?categorie=${recipe.category_id}`} className="font-semibold text-accent hover:underline">
              {recipe.category_name}
            </Link>
          )}
          {recipe.own && (
            <Link to="/retete?ale-mele=1" className="hover:opacity-90">
              <OwnBadge />
            </Link>
          )}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight lg:text-4xl">{recipe.title}</h1>
        {recipe.description && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">{recipe.description}</p>}
        {recipe.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {recipe.tags.map((t) => (
              <Link key={t} to={tagLink(t)} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong hover:underline">
                #{t}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <Meta label="Pregătire" value={formatMinutes(recipe.prep_time)} />
        <Meta label="Gătire" value={formatMinutes(recipe.cook_time)} />
        <Meta label="Total" value={formatMinutes(recipe.total_time)} />
        {recipe.difficulty && (
          <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3">
            <Gauge size={18} className="text-accent" aria-hidden="true" />
            <span>
              <span className="block text-xs font-medium uppercase tracking-wider text-muted">Dificultate</span>
              <span className="font-semibold">{recipe.difficulty[0].toUpperCase() + recipe.difficulty.slice(1)}</span>
            </span>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-4 shadow-card">
        <ServingsControl base={recipe.servings} servings={servings} setServings={setServings} />
        <button
          type="button"
          onClick={() => setCooking(true)}
          className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-5 font-semibold text-on-accent"
          title="Pașii pe tot ecranul, cu ecranul mereu aprins"
        >
          <ChefHat size={22} aria-hidden="true" /> Gătesc acum
        </button>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <Ingredients recipe={recipe} servings={servings} state={ingredientChecks} />
        </div>
        <div className="md:col-span-3">
          <Steps recipe={recipe} state={stepChecks} />
        </div>
      </div>

      {recipe.video_url && (
        <div className="mb-6">
          <RecipeVideo url={recipe.video_url} title={recipe.title} />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <TextBlock icon={Lightbulb} title="Sfaturi utile" text={recipe.tips} />
        <TextBlock icon={NotebookPen} title="Note personale" text={recipe.notes} />
      </div>

      {recipe.source_url && (
        <p className="mt-6 text-sm text-muted">
          Sursa:{" "}
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
            {recipe.source_site} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </p>
      )}

      {cooking && (
        <CookMode
          recipe={recipe}
          servings={servings}
          ingredients={ingredientChecks}
          steps={stepChecks}
          onClose={() => setCooking(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Ștergi rețeta?"
        confirmLabel="Șterge definitiv"
        danger
      >
        <p>
          Rețeta <strong>„{recipe.title}”</strong> va fi ștearsă definitiv, împreună cu poza ei.
        </p>
        <p className="text-muted">Acțiunea nu poate fi anulată.</p>
      </ConfirmDialog>
    </article>
  );
}
