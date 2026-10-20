// Scalarea cantităților după numărul de porții și afișarea lor „ca în bucătărie”.
// Doar câmpul numeric (quantity) se scalează; „la gust”, „un praf”, „2-3” (quantity_text) rămân neschimbate.

const FRACTIONS = [
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

// Unități la care cantitățile mici se scriu ca fracții (½ linguriță, 1 ¼ cană).
const FRACTION_UNITS = new Set([
  "linguriță", "lingură", "cană", "pahar", "bucată", "cățel", "felie", "legătură", "plic", "conservă", "kg", "l",
]);

const PLURALS = {
  bucată: "bucăți",
  linguriță: "lingurițe",
  lingură: "linguri",
  cană: "căni",
  pahar: "pahare",
  cățel: "căței",
  felie: "felii",
  legătură: "legături",
  plic: "plicuri",
  conservă: "conserve",
  praf: "prafuri",
};

export function scaleQuantity(quantity, baseServings, servings) {
  if (quantity == null) return null;
  if (!baseServings || !servings) return quantity;
  return (quantity * servings) / baseServings;
}

function decimal(value, digits) {
  return value.toLocaleString("ro-RO", { maximumFractionDigits: digits, useGrouping: false });
}

export function formatQuantity(value, unit) {
  if (value == null) return "";
  if (value === 0) return "0";
  const useFractions = !unit || FRACTION_UNITS.has(unit);
  if (useFractions && value < 10) {
    const whole = Math.floor(value);
    const rest = value - whole;
    if (rest < 0.06) return String(whole || decimal(value, 2));
    if (rest > 0.94) return String(whole + 1);
    for (const [f, symbol] of FRACTIONS) {
      if (Math.abs(rest - f) < 0.04) return whole ? `${whole} ${symbol}` : symbol;
    }
    return decimal(value, 1);
  }
  if (value >= 100) return decimal(Math.round(value / 5) * 5, 0); // 487,5 g → 490 g
  if (value >= 10) return decimal(Math.round(value), 0);
  return decimal(value, 1);
}

export function formatUnit(unit, value) {
  if (!unit) return "";
  return value != null && value > 1 && PLURALS[unit] ? PLURALS[unit] : unit;
}

/** Textul complet al cantității pentru un ingredient, la numărul de porții dat. */
export function ingredientAmount(ingredient, baseServings, servings) {
  if (ingredient.quantity == null) {
    // „2-3 lingură” → „2-3 linguri”: plural dacă textul conține un număr mai mare ca 1
    const numbers = (ingredient.quantity_text || "").match(/\d+(?:[.,]\d+)?/g) || [];
    const largest = Math.max(0, ...numbers.map((n) => parseFloat(n.replace(",", "."))));
    const unit = formatUnit(ingredient.unit, largest || null);
    return [ingredient.quantity_text, unit].filter(Boolean).join(" ");
  }
  let value = scaleQuantity(ingredient.quantity, baseServings, servings);
  let unit = ingredient.unit;
  // Sub 1 kg / 1 l se afișează în grame / mililitri (0,5 kg → 500 g), de la 1000 g / ml invers (→ 1 kg)
  if ((unit === "kg" || unit === "l") && value > 0 && value < 1) {
    value *= 1000;
    unit = unit === "kg" ? "g" : "ml";
  } else if ((unit === "g" || unit === "ml") && value >= 1000) {
    value /= 1000;
    unit = unit === "g" ? "kg" : "l";
  }
  return [formatQuantity(value, unit), formatUnit(unit, value)].filter(Boolean).join(" ");
}

/** Grupează ingredientele consecutive cu același group_name (păstrând ordinea). */
export function groupIngredients(ingredients) {
  const groups = [];
  for (const ing of ingredients) {
    const name = ing.group_name || null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(ing);
    else groups.push({ name, items: [ing] });
  }
  return groups;
}

// Produse care se cumpără la bucată: pe lista de cumpărături se rotunjesc în sus (⅓ ou → 1 ou).
const COUNTABLE_UNITS = new Set(["bucată", "cățel", "legătură", "plic", "conservă", "felie"]);

export function roundForShopping(item) {
  if (item.quantity == null || (item.unit && !COUNTABLE_UNITS.has(item.unit))) return item;
  return { ...item, quantity: Math.max(1, Math.ceil(item.quantity - 0.01)) };
}
