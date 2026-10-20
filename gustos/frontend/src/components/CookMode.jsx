import { useEffect, useRef, useState } from "react";
import { Check, ChefHat, ChevronLeft, ChevronRight, Lightbulb, ListChecks, MonitorOff, Sun, X } from "lucide-react";
import { groupIngredients, ingredientAmount } from "../scale.js";
import { enterFullscreen, exitFullscreen, keepScreenOn, releaseScreen } from "../screen.js";

function readStep(key, total) {
  try {
    const n = Number(sessionStorage.getItem(key));
    return Number.isInteger(n) && n >= 0 && n < total ? n : 0;
  } catch {
    return 0;
  }
}

function IngredientList({ recipe, servings, ingredients }) {
  const groups = groupIngredients(recipe.ingredients);
  const { checked, toggle } = ingredients;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Ingrediente</h2>
        {servings && <span className="text-sm text-muted">pentru {servings} {servings === 1 ? "porție" : "porții"}</span>}
      </div>
      {recipe.ingredients.length === 0 && <p className="text-muted">Nu sunt trecute ingrediente.</p>}
      <div className="space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.name && <h3 className="mb-1 font-semibold text-accent-strong">{g.name}</h3>}
            <ul>
              {g.items.map((ing) => {
                const done = checked.has(ing.id);
                return (
                  <li key={ing.id}>
                    <button
                      type="button"
                      onClick={() => toggle(ing.id)}
                      aria-pressed={done}
                      className={`-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-2 text-left text-[17px] hover:bg-surface-2 ${
                        done ? "opacity-50" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                          done ? "border-accent bg-accent text-on-accent" : "border-border"
                        }`}
                        aria-hidden="true"
                      >
                        {done && <Check size={16} strokeWidth={3} />}
                      </span>
                      <span className={done ? "line-through" : ""}>
                        <span className="font-semibold tabular-nums">{ingredientAmount(ing, recipe.servings, servings)}</span> {ing.name}
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
      {recipe.tips && (
        <div className="mt-6 rounded-2xl bg-surface-2 p-4">
          <h3 className="mb-1 flex items-center gap-2 font-semibold">
            <Lightbulb size={18} className="text-accent" aria-hidden="true" /> Sfaturi
          </h3>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{recipe.tips}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Modul „gătesc acum”: pașii unul câte unul, cu litere mari, ingredientele alături,
 * ecranul mereu aprins și (unde se poate) ecran complet.
 */
export default function CookMode({ recipe, servings, ingredients, steps, onClose }) {
  const total = recipe.steps.length;
  const stepKey = `gustos-cook-step-${recipe.id}`;
  const [index, setIndex] = useState(() => readStep(stepKey, total));
  const [panel, setPanel] = useState("step"); // pe ecrane înguste: „step” sau „ingredients”
  const [awake, setAwake] = useState(null); // null = se verifică, true / false
  const enteredFullscreen = useRef(false);
  const touch = useRef(null);
  const nextButton = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(stepKey, String(index));
    } catch {
      // fără stocare: pasul curent nu se păstrează
    }
  }, [stepKey, index]);

  // Ecranul aprins și ecranul complet: cerute imediat după click-ul pe „Gătesc acum”.
  useEffect(() => {
    let active = true;
    keepScreenOn().then((ok) => active && setAwake(ok));
    if (!document.fullscreenElement) enterFullscreen().then((ok) => (enteredFullscreen.current = ok));
    nextButton.current?.focus();
    return () => {
      active = false;
      releaseScreen();
      if (enteredFullscreen.current) exitFullscreen();
    };
  }, []);

  const go = (delta) => {
    if (delta > 0 && total) steps.add(index);
    if (delta > 0 && index >= total - 1) {
      try {
        sessionStorage.removeItem(stepKey); // data viitoare se începe de la primul pas
      } catch {
        // fără stocare
      }
      onClose();
      return;
    }
    setPanel("step");
    setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
  };

  // Tastatura: săgeți / PageUp / PageDown pentru pași, Esc pentru ieșire.
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const onKey = (e) => {
      if (["ArrowRight", "PageDown"].includes(e.key)) goRef.current(1);
      else if (["ArrowLeft", "PageUp"].includes(e.key)) goRef.current(-1);
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Glisare stânga / dreapta pe tabletă și telefon.
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) go(dx < 0 ? 1 : -1);
  };

  const last = index >= total - 1;
  const done = steps.checked.has(index);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-fade-in" role="dialog" aria-modal="true" aria-label={`Gătesc acum: ${recipe.title}`}>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 lg:px-5">
        <ChefHat size={26} className="shrink-0 text-accent" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-lg font-semibold">{recipe.title}</p>
        {awake !== null && (
          <span
            className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted sm:flex"
            title={awake ? "Ecranul nu se stinge cât timp ești în acest mod" : "Browserul nu permite menținerea ecranului aprins"}
          >
            {awake ? <Sun size={16} className="text-accent" aria-hidden="true" /> : <MonitorOff size={16} aria-hidden="true" />}
            {awake ? "Ecranul rămâne aprins" : "Ecranul se poate stinge"}
          </span>
        )}
        <button
          type="button"
          onClick={() => setPanel((p) => (p === "step" ? "ingredients" : "step"))}
          aria-pressed={panel === "ingredients"}
          className={`flex h-11 items-center gap-2 rounded-xl px-3 font-medium lg:hidden ${
            panel === "ingredients" ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-text"
          }`}
        >
          <ListChecks size={20} aria-hidden="true" /> <span className="hidden sm:inline">Ingrediente</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Ieși din modul gătesc acum"
          title="Ieși (Esc)"
        >
          <X size={24} />
        </button>
      </header>

      {total > 1 && (
        <div className="flex shrink-0 gap-1.5 px-4 pt-3 lg:px-6" role="tablist" aria-label="Pași">
          {recipe.steps.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Pasul ${i + 1}`}
              onClick={() => {
                setPanel("step");
                setIndex(i);
              }}
              className="group flex-1 py-2"
            >
              <span
                className={`block h-2 rounded-full transition-colors ${
                  i === index ? "bg-accent" : steps.checked.has(i) ? "bg-accent opacity-40" : "bg-border group-hover:bg-muted"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${panel === "ingredients" ? "block" : "hidden"} w-full overflow-y-auto p-5 lg:block lg:w-[380px] lg:shrink-0 lg:border-r lg:border-border`}
        >
          <IngredientList recipe={recipe} servings={servings} ingredients={ingredients} />
        </aside>

        <main
          className={`${panel === "step" ? "flex" : "hidden"} min-w-0 flex-1 flex-col overflow-y-auto p-6 lg:flex lg:p-12`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="my-auto w-full max-w-4xl">
            {total === 0 ? (
              <p className="text-2xl text-muted">Rețeta nu are pași trecuți. Ingredientele sunt în listă.</p>
            ) : (
              <>
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-accent">
                  Pasul {index + 1} din {total}
                  {done && <Check size={18} strokeWidth={3} aria-label="făcut" />}
                </p>
                <p className="text-2xl leading-relaxed md:text-3xl md:leading-relaxed" aria-live="polite">
                  {recipe.steps[index]}
                </p>
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="flex shrink-0 gap-3 border-t border-border bg-surface p-3 lg:px-5">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl border border-border text-lg font-medium hover:bg-surface-2 disabled:opacity-40"
        >
          <ChevronLeft size={24} aria-hidden="true" /> Înapoi
        </button>
        <button
          type="button"
          ref={nextButton}
          onClick={() => go(1)}
          className="flex h-16 flex-[2] items-center justify-center gap-2 rounded-2xl bg-accent text-lg font-semibold text-on-accent"
        >
          {last ? (
            <>
              <Check size={24} aria-hidden="true" /> Am terminat
            </>
          ) : (
            <>
              Pasul următor <ChevronRight size={24} aria-hidden="true" />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
