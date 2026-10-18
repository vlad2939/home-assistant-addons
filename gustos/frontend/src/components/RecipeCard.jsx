import { useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat, Clock } from "lucide-react";
import { formatMinutes, photoUrl } from "../format.js";
import FavoriteButton from "./FavoriteButton.jsx";

export function RecipePhoto({ recipe, thumb = true, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = photoUrl(recipe.photo, { thumb });
  if (src && !failed) {
    return (
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
    );
  }
  return (
    <div className={`flex items-center justify-center bg-accent-soft text-accent ${className}`} aria-hidden="true">
      <ChefHat size={48} strokeWidth={1.4} />
    </div>
  );
}

export default function RecipeCard({ recipe, onFavoriteChange }) {
  const time = formatMinutes(recipe.total_time);
  return (
    <Link
      to={`/reteta/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <RecipePhoto recipe={recipe} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <FavoriteButton
          recipeId={recipe.id}
          favorite={recipe.favorite}
          onChange={(fav) => onFavoriteChange?.(recipe.id, fav)}
          className="absolute right-2 top-2 bg-surface/85 text-text shadow-card backdrop-blur"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug">{recipe.title}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {recipe.category_name && <span className="font-medium text-accent-strong">{recipe.category_name}</span>}
          {time && (
            <span className="flex items-center gap-1">
              <Clock size={15} aria-hidden="true" />
              {time}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function RecipeGrid({ recipes, onFavoriteChange }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 lg:gap-5">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onFavoriteChange={onFavoriteChange} />
      ))}
    </div>
  );
}
