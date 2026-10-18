// Câmpul „Cantitate” din formular: un singur text, interpretat la salvare.
//   „500”, „0,5”, „1/2”, „1 1/2”, „1 ½”  → cantitate numerică (se scalează cu porțiile)
//   „2-3”, „un praf”, „câteva”           → text, păstrat ca atare (nu se scalează)

const UNICODE_FRACTIONS = { "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8" };

export function parseQuantity(input) {
  const text = (input ?? "").trim();
  if (!text) return { quantity: null, quantity_text: null };
  const normalized = text
    .replace(/[¼½¾⅓⅔⅛]/g, (f) => ` ${UNICODE_FRACTIONS[f]}`)
    .replace(",", ".")
    .replace(/\s+/g, " ")
    .trim();

  let m = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return { quantity: Number(m[1]), quantity_text: null };
  m = normalized.match(/^(\d+) ?\/ ?(\d+)$/);
  if (m && Number(m[2]) > 0) return { quantity: Number(m[1]) / Number(m[2]), quantity_text: null };
  m = normalized.match(/^(\d+) (\d+) ?\/ ?(\d+)$/);
  if (m && Number(m[3]) > 0) return { quantity: Number(m[1]) + Number(m[2]) / Number(m[3]), quantity_text: null };

  return { quantity: null, quantity_text: text.slice(0, 50) };
}

const NICE_FRACTIONS = [
  [0.25, "1/4"],
  [1 / 3, "1/3"],
  [0.5, "1/2"],
  [2 / 3, "2/3"],
  [0.75, "3/4"],
];

/** Valoarea afișată în câmp la editarea unui ingredient existent. */
export function quantityForInput(ingredient) {
  if (ingredient.quantity == null) return ingredient.quantity_text ?? "";
  const q = ingredient.quantity;
  const whole = Math.floor(q);
  const rest = q - whole;
  if (rest > 0.001) {
    for (const [value, text] of NICE_FRACTIONS) {
      if (Math.abs(rest - value) < 0.001) return whole ? `${whole} ${text}` : text;
    }
  }
  return String(Math.round(q * 1000) / 1000).replace(".", ",");
}
