// Formatări comune pentru afișare.

export function formatMinutes(minutes) {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function sourceLabel(site) {
  return site === "manual" ? "Adăugate manual" : site;
}

// Poze: „<id>.webp” (mare) și „<id>_thumb.webp” (miniatură), servite de la /photos/.
export function photoUrl(photo, { thumb = false } = {}) {
  if (!photo) return null;
  return `/photos/${thumb ? photo.replace(/\.webp$/, "_thumb.webp") : photo}`;
}
