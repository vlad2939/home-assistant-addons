// Conversia între rețeta din API și starea formularului, plus validarea.

import { parseQuantity, quantityForInput } from "./quantity.js";
import { newKey } from "./components/form/fields.jsx";
import { emptyGroup } from "./components/form/IngredientsEditor.jsx";
import { emptyStep } from "./components/form/StepsEditor.jsx";

const str = (v) => (v == null ? "" : String(v));

export function emptyForm() {
  return {
    title: "",
    description: "",
    servings: "",
    prep_time: "",
    cook_time: "",
    difficulty: "",
    category_id: "",
    tags: [],
    groups: [emptyGroup()],
    steps: [emptyStep()],
    tips: "",
    notes: "",
    source_url: "",
    video_url: "",
    own: false,
  };
}

/** Rețetă (din API sau din import) → starea formularului. */
export function toForm(recipe) {
  const groups = [];
  for (const ing of recipe.ingredients ?? []) {
    const name = ing.group_name ?? "";
    let group = groups[groups.length - 1];
    if (!group || group.name !== name) {
      group = { key: newKey(), name, items: [] };
      groups.push(group);
    }
    group.items.push({
      key: newKey(),
      quantity: quantityForInput(ing),
      unit: str(ing.unit),
      name: str(ing.name),
      note: str(ing.note),
    });
  }
  return {
    title: str(recipe.title),
    description: str(recipe.description),
    servings: str(recipe.servings),
    prep_time: str(recipe.prep_time),
    cook_time: str(recipe.cook_time),
    difficulty: str(recipe.difficulty),
    category_id: str(recipe.category_id),
    tags: [...(recipe.tags ?? [])],
    groups: groups.length ? groups : [emptyGroup()],
    steps: (recipe.steps ?? []).length ? recipe.steps.map((t) => emptyStep(t)) : [emptyStep()],
    tips: str(recipe.tips),
    notes: str(recipe.notes),
    source_url: str(recipe.source_url),
    video_url: str(recipe.video_url),
    own: Boolean(recipe.own),
  };
}

function wholeNumber(value, { min, max, label, example }, errors, field) {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) {
    errors[field] = `${label}: scrie un număr întreg (ex. ${example}).`;
    return null;
  }
  const n = Number(text);
  if (n < min || n > max) errors[field] = `${label}: între ${min} și ${max}.`;
  return n;
}

/** Starea formularului → { payload pentru API, errors }. Rândurile complet goale sunt ignorate. */
export function toPayload(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Titlul este obligatoriu.";

  const servings = wholeNumber(form.servings, { min: 1, max: 200, label: "Porții", example: 4 }, errors, "servings");
  const prep = wholeNumber(form.prep_time, { min: 0, max: 10000, label: "Timp de pregătire", example: 20 }, errors, "prep_time");
  const cook = wholeNumber(form.cook_time, { min: 0, max: 10000, label: "Timp de gătire", example: 45 }, errors, "cook_time");

  const source = form.source_url.trim();
  if (source && !/^https?:\/\/\S+$/i.test(source)) errors.source_url = "Linkul trebuie să înceapă cu http:// sau https://";
  const video = form.video_url.trim();
  if (video && !/^https?:\/\/\S+$/i.test(video)) errors.video_url = "Linkul trebuie să înceapă cu http:// sau https://";

  const ingredients = [];
  for (const group of form.groups) {
    for (const item of group.items) {
      const empty = !item.quantity.trim() && !item.unit.trim() && !item.name.trim() && !item.note.trim();
      if (empty) continue;
      if (!item.name.trim()) {
        errors[`ing-${item.key}`] = "Completează denumirea ingredientului (sau șterge rândul).";
        continue;
      }
      ingredients.push({
        group_name: group.name.trim() || null,
        ...parseQuantity(item.quantity),
        unit: item.unit.trim() || null,
        name: item.name.trim(),
        note: item.note.trim() || null,
      });
    }
  }

  const payload = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    servings,
    prep_time: prep,
    cook_time: cook,
    difficulty: form.difficulty || null,
    category_id: form.category_id ? Number(form.category_id) : null,
    tags: form.tags,
    ingredients,
    steps: form.steps.map((s) => s.text.trim()).filter(Boolean),
    tips: form.tips.trim() || null,
    notes: form.notes.trim() || null,
    source_url: source || null,
    video_url: video || null,
    own: Boolean(form.own),
  };
  return { payload, errors };
}

/** Comparație pentru „modificări nesalvate”, fără cheile interne ale rândurilor. */
export function formSignature(form) {
  return JSON.stringify(toPayload(form).payload);
}
