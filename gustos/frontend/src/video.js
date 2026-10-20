// Clipuri video: din linkul salvat la rețetă → ce se poate reda direct în pagină.

const YOUTUBE =
  /^https?:\/\/(?:[\w-]+\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})(?![\w-])/i;
const VIMEO = /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?!\d)/i;

/** { kind: "youtube" | "vimeo" | "link", id?, url } sau null dacă linkul lipsește / nu e http(s). */
export function parseVideo(url) {
  const text = (url || "").trim();
  if (!/^https?:\/\//i.test(text)) return null;
  let m = text.match(YOUTUBE);
  if (m) return { kind: "youtube", id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
  m = text.match(VIMEO);
  if (m) return { kind: "vimeo", id: m[1], url: `https://vimeo.com/${m[1]}` };
  return { kind: "link", url: text };
}

/** Adresa playerului încorporat, pornit direct (clipurile YouTube se redau de fapt prin youtube.js). */
export function embedUrl(video) {
  if (video?.kind === "youtube") return `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`;
  if (video?.kind === "vimeo") return `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1`;
  return null;
}

export function thumbnailUrl(video) {
  return video?.kind === "youtube" ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : null;
}

export function siteLabel(video) {
  if (video?.kind === "youtube") return "YouTube";
  if (video?.kind === "vimeo") return "Vimeo";
  try {
    return new URL(video.url).hostname.replace(/^www\./, "");
  } catch {
    return "site";
  }
}
