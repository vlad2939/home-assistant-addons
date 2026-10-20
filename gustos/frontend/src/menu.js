// Meniuri: mesele săptămânii, felurile unui eveniment și datele calendaristice (fără fus orar).

export const MEALS = [
  { id: "mic_dejun", label: "Mic dejun" },
  { id: "pranz", label: "Prânz" },
  { id: "cina", label: "Cină" },
];

export const COURSES = [
  { id: "aperitive", label: "Aperitive" },
  { id: "supe", label: "Supe și ciorbe" },
  { id: "principal", label: "Fel principal" },
  { id: "garnituri", label: "Garnituri și salate" },
  { id: "desert", label: "Desert" },
  { id: "bauturi", label: "Băuturi" },
];

export const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];

const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

/** „2026-10-19” → Date local (fără conversii de fus orar). */
export function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Lunea săptămânii în care cade data. */
export function mondayOf(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** Ziua săptămânii, 0 = luni … 6 = duminică. */
export function weekday(date) {
  return (date.getDay() + 6) % 7;
}

/** „20 – 26 octombrie 2026”, „27 octombrie – 2 noiembrie 2026”, „29 decembrie 2026 – 4 ianuarie 2027”. */
export function weekRange(startIso) {
  const start = parseDate(startIso);
  const end = addDays(start, 6);
  const endText = `${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  if (start.getFullYear() !== end.getFullYear()) return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${endText}`;
  if (start.getMonth() !== end.getMonth()) return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${endText}`;
  return `${start.getDate()} – ${endText}`;
}

/** „25 decembrie 2026” */
export function longDate(iso) {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** „20 oct.” pentru antetul zilelor. */
export function shortDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}.`;
}

export function menuTitle(menu) {
  if (menu.kind === "event") return menu.title;
  return `Săptămâna ${weekRange(menu.start_date)}`;
}

export const slotLabel = (kind, slot) => (kind === "week" ? MEALS : COURSES).find((s) => s.id === slot)?.label ?? slot;

export const recipeCount = (n) => `${n} ${n === 1 ? "rețetă" : "rețete"}`;
export const peopleCount = (n) => `${n} ${n === 1 ? "persoană" : "persoane"}`;
