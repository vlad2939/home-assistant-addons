import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Dices, Plus } from "lucide-react";
import { api } from "../api.js";
import { useApp } from "../AppContext.jsx";
import { formatMinutes } from "../format.js";
import PageHeader from "../components/PageHeader.jsx";
import { RecipeGrid, RecipePhoto } from "../components/RecipeCard.jsx";

const PREVIEW = 4;

function Stat({ label, value, to }) {
  return (
    <Link to={to} className="rounded-3xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value ?? "–"}</p>
    </Link>
  );
}

function Section({ title, to, children }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link to={to} className="flex items-center gap-1 font-medium text-accent hover:underline">
          Vezi toate <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function TodaySuggestion({ recipe, onAnother }) {
  return (
    <section className="mb-10 overflow-hidden rounded-3xl border border-border bg-surface shadow-card md:flex">
      <Link to={`/reteta/${recipe.id}`} className="block md:w-2/5">
        <RecipePhoto recipe={recipe} thumb={false} className="aspect-[4/3] h-full w-full" />
      </Link>
      <div className="flex flex-1 flex-col justify-center gap-3 p-6 lg:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Ce gătesc azi?</p>
        <Link to={`/reteta/${recipe.id}`} className="text-2xl font-semibold hover:underline lg:text-3xl">
          {recipe.title}
        </Link>
        {recipe.description && <p className="line-clamp-2 text-muted">{recipe.description}</p>}
        <p className="text-sm text-muted">
          {[recipe.category_name, formatMinutes(recipe.total_time)].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link to={`/reteta/${recipe.id}`} className="rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent">
            Vezi rețeta
          </Link>
          <button
            type="button"
            onClick={onAnother}
            className="flex items-center gap-2 rounded-2xl border border-border px-5 py-3 font-medium hover:bg-surface-2"
          >
            <Dices size={20} aria-hidden="true" /> Altă sugestie
          </button>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { stats } = useApp();
  const [recent, setRecent] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [suggestion, setSuggestion] = useState(null);

  const load = useCallback(() => {
    api.get("/api/recipes?sort=recent").then((r) => setRecent(r.items.slice(0, PREVIEW))).catch(() => setRecent([]));
    api.get("/api/recipes?favorite=true&sort=updated").then((r) => setFavorites(r.items.slice(0, PREVIEW))).catch(() => {});
  }, []);

  const suggest = useCallback(() => {
    api.get("/api/recipes/random").then(setSuggestion).catch(() => setSuggestion(null));
  }, []);

  useEffect(() => {
    load();
    suggest();
  }, [load, suggest]);

  const onFavoriteChange = () => load();

  if (recent && recent.length === 0) {
    return (
      <>
        <PageHeader title="Bine ai venit în Gustos!" subtitle="Încă nu ai nicio rețetă." />
        <div className="flex flex-wrap gap-3">
          <Link to="/adauga" className="flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent">
            <Plus size={20} /> Adaugă prima rețetă
          </Link>
          <Link to="/import" className="rounded-2xl border border-border px-5 py-3 font-medium hover:bg-surface-2">
            Importă dintr-un link
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Rețete" value={stats?.recipes} to="/retete" />
        <Stat label="Favorite" value={stats?.favorites} to="/retete?favorite=1" />
        <Stat label="Categorii" value={stats?.categories} to="/retete" />
        <Stat label="Tag-uri" value={stats?.tags} to="/retete" />
      </div>

      {suggestion && <TodaySuggestion recipe={suggestion} onAnother={suggest} />}

      {recent && (
        <Section title="Adăugate recent" to="/retete?sortare=recent">
          <RecipeGrid recipes={recent} onFavoriteChange={onFavoriteChange} />
        </Section>
      )}

      {favorites.length > 0 && (
        <Section title="Favorite" to="/retete?favorite=1">
          <RecipeGrid recipes={favorites} onFavoriteChange={onFavoriteChange} />
        </Section>
      )}
    </>
  );
}
