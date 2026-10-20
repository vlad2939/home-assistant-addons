// Paginile de tipar / PDF: rețeta, meniul și lista de cumpărături. Doar pentru citit.

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { formatMinutes, photoUrl } from "../format.js";
import { groupIngredients, ingredientAmount, roundForShopping } from "../scale.js";
import { COURSES, DAYS, MEALS, addDays, longDate, menuTitle, parseDate, peopleCount, shortDate, toIso } from "../menu.js";
import PrintLayout from "../components/PrintLayout.jsx";

const MUTED = "text-[#6e665d]";
const RULE = "border-[#e2dcd3]";

function Box() {
  return <span className={`mt-[3px] inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border-[1.5px] border-[#8a837b]`} aria-hidden="true" />;
}

function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.get(path).then(setData).catch((e) => setError(e.message));
  }, [path]);
  return [data, error];
}

function Failed({ message }) {
  return (
    <PrintLayout title="Gustos" ready>
      <p className="text-[var(--accent-red)]">{message}</p>
    </PrintLayout>
  );
}

// ---------- rețeta ----------

export function PrintRecipe() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const [recipe, error] = useLoad(`/api/recipes/${id}`);
  if (error) return <Failed message={error} />;

  // porțiile din link contează doar dacă rețeta are porții (altfel cantitățile nu se pot scala)
  const servings = recipe?.servings ? Number(search.get("portii")) || recipe.servings : null;
  const meta = recipe && [
    servings && `${servings} ${servings === 1 ? "porție" : "porții"}`,
    recipe.prep_time != null && `Pregătire ${formatMinutes(recipe.prep_time)}`,
    recipe.cook_time != null && `Gătire ${formatMinutes(recipe.cook_time)}`,
    recipe.total_time != null && `Total ${formatMinutes(recipe.total_time)}`,
    recipe.difficulty && `Dificultate ${recipe.difficulty}`,
  ].filter(Boolean);

  return (
    <PrintLayout title={recipe?.title} ready={Boolean(recipe)}>
      {recipe && (
        <article className="text-[11pt] leading-relaxed">
          <header className="mb-5 flex gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10pt] font-semibold uppercase tracking-wider text-[#c4570b]">
                {[recipe.category_name, recipe.own && "Rețeta mea"].filter(Boolean).join(" · ")}
              </p>
              <h1 className="mt-1 text-[22pt] font-bold leading-tight">{recipe.title}</h1>
              {meta.length > 0 && <p className={`mt-2 ${MUTED}`}>{meta.join("  ·  ")}</p>}
              {recipe.description && <p className="mt-3">{recipe.description}</p>}
              {recipe.tags.length > 0 && <p className={`mt-2 text-[10pt] ${MUTED}`}>{recipe.tags.map((t) => `#${t}`).join("  ")}</p>}
            </div>
            {recipe.photo && <img src={photoUrl(recipe.photo)} alt="" className="h-[52mm] w-[70mm] shrink-0 rounded-lg object-cover" />}
          </header>

          <div className="grid grid-cols-[35%_1fr] gap-7">
            <section>
              <h2 className={`mb-2 border-b ${RULE} pb-1 text-[13pt] font-bold`}>Ingrediente</h2>
              {groupIngredients(recipe.ingredients).map((g, gi) => (
                <div key={gi} className="print-keep mb-3">
                  {g.name && <h3 className="mb-1 font-semibold">{g.name}</h3>}
                  <ul className="space-y-1">
                    {g.items.map((ing) => {
                      const amount = ingredientAmount(ing, recipe.servings, servings);
                      return (
                        <li key={ing.id} className="flex gap-2">
                          <Box />
                          <span>
                            {amount && <strong>{amount} </strong>}
                            {ing.name}
                            {ing.note && <span className={MUTED}>, {ing.note}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
            <section>
              <h2 className={`mb-2 border-b ${RULE} pb-1 text-[13pt] font-bold`}>Mod de preparare</h2>
              <ol className="space-y-2.5">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="print-keep flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#c4570b] text-[9pt] font-bold text-[#c4570b]">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {[["Sfaturi utile", recipe.tips], ["Note personale", recipe.notes]].map(
            ([label, text]) =>
              text && (
                <section key={label} className="print-keep mt-5">
                  <h2 className={`mb-1 border-b ${RULE} pb-1 text-[13pt] font-bold`}>{label}</h2>
                  <p className="whitespace-pre-line">{text}</p>
                </section>
              ),
          )}

          {(recipe.source_url || recipe.video_url) && (
            <p className={`mt-5 break-all text-[9pt] ${MUTED}`}>
              {recipe.source_url && <>Sursa: {recipe.source_url}</>}
              {recipe.source_url && recipe.video_url && <br />}
              {recipe.video_url && <>Video: {recipe.video_url}</>}
            </p>
          )}
        </article>
      )}
    </PrintLayout>
  );
}

// ---------- meniul ----------

const itemText = (item) => `${item.title} (${item.servings} ${item.servings === 1 ? "porție" : "porții"})`;

export function PrintMenu() {
  const { id } = useParams();
  const [menu, error] = useLoad(`/api/menus/${id}`);
  if (error) return <Failed message={error} />;
  const isWeek = menu?.kind === "week";

  return (
    <PrintLayout title={menu && menuTitle(menu)} ready={Boolean(menu)}>
      {menu && (
        <div className="text-[11pt] leading-snug">
          <h1 className="text-[20pt] font-bold">{menuTitle(menu)}</h1>
          <p className={`mt-1 ${MUTED}`}>{[!isWeek && longDate(menu.start_date), peopleCount(menu.guests)].filter(Boolean).join("  ·  ")}</p>
          {menu.notes && <p className="mt-2 whitespace-pre-line">{menu.notes}</p>}

          {isWeek ? (
            <table className="mt-5 w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th className={`w-[22%] border ${RULE} bg-[#f6f3ef] p-2 text-left`}>Ziua</th>
                  {MEALS.map((m) => (
                    <th key={m.id} className={`border ${RULE} bg-[#f6f3ef] p-2 text-left`}>
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((name, day) => (
                  <tr key={day} className="print-keep align-top">
                    <td className={`border ${RULE} p-2`}>
                      <strong>{name}</strong>
                      <span className={`block text-[9pt] ${MUTED}`}>{shortDate(addDays(parseDate(menu.start_date), day))}</span>
                    </td>
                    {MEALS.map((m) => (
                      <td key={m.id} className={`border ${RULE} p-2`}>
                        {menu.items
                          .filter((i) => i.day === day && i.slot === m.id)
                          .map((i) => (
                            <p key={i.id} className="mb-1">
                              {itemText(i)}
                            </p>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-5 space-y-4">
              {COURSES.map((course) => {
                const items = menu.items.filter((i) => i.slot === course.id);
                if (!items.length) return null;
                return (
                  <section key={course.id} className="print-keep">
                    <h2 className={`mb-1 border-b ${RULE} pb-1 text-[13pt] font-bold`}>{course.label}</h2>
                    <ul className="list-disc pl-5">
                      {items.map((i) => (
                        <li key={i.id}>{itemText(i)}</li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PrintLayout>
  );
}

// ---------- lista de cumpărături ----------

export function PrintShopping() {
  const [data, error] = useLoad("/api/shopping");
  if (error) return <Failed message={error} />;
  const items = data?.items.filter((i) => !i.checked) ?? [];
  const aisles = [...new Set(items.map((i) => i.aisle))];
  const today = new Date();

  return (
    <PrintLayout title={`Cumpărături ${shortDate(today)}`} ready={Boolean(data)}>
      {data && (
        <div className="text-[11pt] leading-snug">
          <h1 className="text-[20pt] font-bold">Cumpărături</h1>
          <p className={`mt-1 ${MUTED}`}>
            {longDate(toIso(today))} · {items.length} {items.length === 1 ? "produs" : "produse"}
          </p>
          {items.length === 0 && <p className="mt-4">Lista e goală.</p>}
          <div className="mt-5 columns-2 gap-8">
            {aisles.map((aisle) => (
              <section key={aisle} className="print-keep mb-4">
                <h2 className={`mb-1.5 border-b ${RULE} pb-1 text-[12pt] font-bold`}>{aisle}</h2>
                <ul className="space-y-1.5">
                  {items
                    .filter((i) => i.aisle === aisle)
                    .map((i) => {
                      const amount = ingredientAmount(roundForShopping(i), null, null);
                      return (
                        <li key={i.id} className="flex gap-2">
                          <Box />
                          <span>
                            {amount && <strong>{amount} </strong>}
                            {i.name}
                            {i.note && <span className={MUTED}>, {i.note}</span>}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </PrintLayout>
  );
}
