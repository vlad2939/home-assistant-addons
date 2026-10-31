"use strict";

const $ = (id) => document.getElementById(id);
const state = {
  path: "", entries: [], selected: new Set(), sort: "name", descending: false,
  view: "list", query: "", globalSearch: false, globalResults: [], searchToken: 0, searchTimer: null,
  lastSelectedPath: null, targetAction: "move", contextMenuEntry: null,
  pendingRename: null, pendingDelete: [],
  toastTimer: null, transfers: new Map(), transferId: 0,
  transferFrame: 0,
  previewItem: null, audioItem: null, mediaPlaylist: [], mediaIndex: -1,
  imagePlaylist: [], imageIndex: -1, documentPlaylist: [], documentIndex: -1,
  imageZoom: 1, imageRotation: 0,
  playAllActive: false,
};
const root = document.documentElement;
const accentPalette = {
  orange: { dark: ["#f58a2a", "#ffa044", "rgb(245 138 42 / 12%)"], light: ["#e97818", "#d9660b", "rgb(233 120 24 / 10%)"] },
  blue: { dark: ["#83b6ff", "#a0c7ff", "rgb(103 160 239 / 14%)"], light: ["#2869c7", "#1e55a6", "rgb(40 105 199 / 10%)"] },
  purple: { dark: ["#b49aff", "#c8b6ff", "rgb(157 123 232 / 15%)"], light: ["#7650c5", "#603bad", "rgb(118 80 197 / 10%)"] },
  teal: { dark: ["#53c9b5", "#77dfcc", "rgb(55 176 154 / 14%)"], light: ["#148775", "#0e705f", "rgb(20 135 117 / 10%)"] },
  rose: { dark: ["#f28ba2", "#ffa5b8", "rgb(220 89 119 / 14%)"], light: ["#c94d69", "#ad3854", "rgb(201 77 105 / 10%)"] },
};

const icons = {
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/>',
  delete: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  folder: '<path d="M3.5 6.5h6l2 2h9v10a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18z"/>',
  file: '<path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4M9 12h6m-6 3h6"/>',
  image: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m20 15-5-5L5 20"/>',
  audio: '<path d="M9 18V5l12-2v13M9 18c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Zm12-2c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2Z"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  archive: '<path d="M4 4h16v16H4zM4 8h16M10 4v2m4-2v2m-2 5v5"/>',
};

function icon(name, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  svg.innerHTML = icons[name] || icons.file;
  return svg;
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("file-server-theme-v2", theme);
  $("theme-icon").innerHTML = theme === "dark"
    ? '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
    : '<path d="M20.4 15.2A8.4 8.4 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z"/>';
  $("theme-toggle").setAttribute("aria-label", `Schimbă la tema ${theme === "dark" ? "deschisă" : "închisă"}`);
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#11151b" : "#f3f4f5";
  setAccent(localStorage.getItem("file-server-accent") || "orange");
}

function setAccent(name) {
  const accentName = accentPalette[name] ? name : "orange";
  const colors = accentPalette[accentName][root.dataset.theme === "light" ? "light" : "dark"];
  root.style.setProperty("--accent", colors[0]);
  root.style.setProperty("--accent-hover", colors[1]);
  root.style.setProperty("--accent-soft", colors[2]);
  localStorage.setItem("file-server-accent", accentName);
  document.querySelectorAll(".accent-choice").forEach((button) => {
    const selected = button.dataset.accent === accentName;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function toast(message, error = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => node.classList.remove("show"), 3300);
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const type = response.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(body?.error || `Eroare HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function formatSize(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}

async function refreshUsage() {
  try {
    const usage = await api("/api/usage");
    const percent = Math.min(100, Math.max(0, usage.percent));
    $("quota-used").textContent = `${formatSize(usage.usedBytes)} / ${formatSize(usage.limitBytes)}`;
    $("quota-free").textContent = `${formatSize(usage.availableBytes)} liberi`;
    $("quota-bar").style.width = `${percent}%`;
    $("quota-track").setAttribute("aria-valuenow", String(Math.round(percent)));
    $("quota-track").classList.toggle("warning", percent >= 80 && percent < 100);
    $("quota-track").classList.toggle("full", percent >= 100);
  } catch (error) { console.error("Nu s-a putut citi spațiul de stocare:", error); }
}

function formatRate(bytes, elapsed) {
  if (!elapsed || bytes <= 0) return "Se pregătește…";
  return `${formatSize(bytes / elapsed)} / s`;
}

function fileKind(entry) {
  if (entry.type === "folder") return "folder";
  const ext = entry.name.split(".").pop().toLowerCase();
  if (["avif", "bmp", "gif", "ico", "jpg", "jpeg", "png", "webp", "svg", "heic"].includes(ext)) return "image";
  if (["aac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "weba"].includes(ext)) return "audio";
  if (["mp4", "m4v", "ogv", "webm", "mkv", "avi", "mov"].includes(ext)) return "video";
  if (["zip", "7z", "rar", "tar", "gz", "bz2"].includes(ext)) return "archive";
  return "file";
}

const previewableExtensions = new Set([
  "pdf", "avif", "bmp", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp",
  "aac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "weba",
  "mp4", "m4v", "ogv", "webm",
  "txt", "log", "csv", "tsv", "json", "xml", "html", "htm", "css", "js", "mjs", "md", "yaml", "yml", "ini", "conf", "sh", "py", "c", "h", "cpp", "java", "sql",
]);

function isPreviewable(name) { return previewableExtensions.has(name.split(".").pop().toLowerCase()); }

function previewType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["avif", "bmp", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp"].includes(ext)) return "image";
  if (["aac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "weba"].includes(ext)) return "audio";
  if (["mp4", "m4v", "ogv", "webm"].includes(ext)) return "video";
  if (["txt", "log", "csv", "tsv", "json", "xml", "html", "htm", "css", "js", "mjs", "md", "yaml", "yml", "ini", "conf", "sh", "py", "c", "h", "cpp", "java", "sql"].includes(ext)) return "text";
  return "";
}

function previewUrl(rel) { return `/api/preview?path=${encodeURIComponent(rel)}`; }

function openPreview(rel, entry, keepPlaylist = false) {
  const kind = previewType(entry.name) || "unsupported";
  const item = { ...entry, path: rel, kind };
  if (!keepPlaylist) {
    state.playAllActive = false;
    if (kind === "image") {
      state.imagePlaylist = visibleEntries()
        .filter((candidate) => candidate.type !== "folder" && previewType(candidate.name) === "image")
        .map((candidate) => ({ ...candidate, path: entryPath(candidate), kind: "image" }));
      state.imageIndex = state.imagePlaylist.findIndex((candidate) => candidate.path === rel);
    } else if (["pdf", "text"].includes(kind)) {
      state.documentPlaylist = visibleEntries()
        .filter((candidate) => candidate.type !== "folder" && ["pdf", "text"].includes(previewType(candidate.name)))
        .map((candidate) => ({ ...candidate, path: entryPath(candidate), kind: previewType(candidate.name) }));
      state.documentIndex = state.documentPlaylist.findIndex((candidate) => candidate.path === rel);
    } else if (["audio", "video"].includes(kind)) {
      state.mediaPlaylist = visibleEntries()
        .filter((candidate) => candidate.type !== "folder" && ["audio", "video"].includes(previewType(candidate.name)))
        .map((candidate) => ({ ...candidate, path: entryPath(candidate), kind: previewType(candidate.name) }));
      state.mediaIndex = state.mediaPlaylist.findIndex((candidate) => candidate.path === rel);
    }
  }
  showPreview(item);
}

function showPreview(item) {
  const url = previewUrl(item.path);
  const audio = $("preview-audio");
  const video = $("preview-video");
  const image = $("preview-image");
  const pdf = $("preview-pdf");
  const text = $("preview-text");
  state.previewItem = item;
  if (item.kind === "audio") state.audioItem = item;
  const audioIsPlaying = !audio.paused && Boolean(audio.currentSrc);
  $("mini-audio-player").hidden = item.kind === "audio" || !audioIsPlaying;
  $("preview-filename").textContent = item.name;
  $("preview-kind").textContent = ({ image: "Imagine", video: "Video", audio: "Audio", pdf: "Document PDF", text: "Text / cod", unsupported: "Fișier fără preview" })[item.kind] || "Previzualizare";
  $("preview-download").href = `/api/download?path=${encodeURIComponent(item.path)}`;
  $("preview-download").download = item.name;
  const hasImageQueue = item.kind === "image" && state.imagePlaylist.length > 1;
  const hasDocumentQueue = ["pdf", "text"].includes(item.kind) && state.documentPlaylist.length > 1;
  const hasMediaQueue = ["audio", "video"].includes(item.kind) && state.mediaPlaylist.length > 1;
  $("preview-previous").hidden = !(hasImageQueue || hasDocumentQueue || hasMediaQueue);
  $("preview-next").hidden = !(hasImageQueue || hasDocumentQueue || hasMediaQueue);
  $("image-controls").hidden = item.kind !== "image";
  const unsupported = $("preview-unsupported");
  unsupported.hidden = true;
  unsupported.replaceChildren();
  for (const element of [image, video, pdf, text]) element.hidden = true;
  if (item.kind !== "audio") audio.hidden = true;
  if (item.kind !== "video") { video.pause(); video.removeAttribute("src"); video.load(); }
  pdf.removeAttribute("src");
  text.textContent = "";
  $("preview-modal").hidden = false;

  if (item.kind === "image") {
    state.imageZoom = 1;
    state.imageRotation = 0;
    image.src = url;
    image.style.transform = "scale(1) rotate(0deg)";
    $("image-zoom-reset").textContent = "100%";
    image.hidden = false;
  } else if (item.kind === "video") {
    audio.pause();
    video.src = url;
    video.onended = playNextMedia;
    video.hidden = false;
    video.play().catch(() => {});
  } else if (item.kind === "audio") {
    audio.hidden = false;
    $("mini-audio-player").hidden = true;
    if (!audio.src.endsWith(url)) {
      audio.src = url;
      audio.load();
    }
    audio.onended = playNextMedia;
    audio.play().catch(() => {});
  } else if (item.kind === "pdf") {
    pdf.src = url;
    pdf.hidden = false;
  } else if (item.kind === "text") {
    text.textContent = "Se încarcă documentul…";
    text.hidden = false;
    fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Eroare HTTP ${response.status}`);
      return response.text();
    }).then((content) => {
      if (state.previewItem?.path === item.path) text.textContent = content;
    }).catch((error) => {
      if (state.previewItem?.path === item.path) text.textContent = `Documentul nu a putut fi citit: ${error.message}`;
    });
  } else {
    const extension = item.name.includes(".") ? item.name.split(".").pop().toUpperCase() : "necunoscut";
    const heading = document.createElement("strong");
    heading.textContent = "Previzualizarea nu este disponibilă";
    const message = document.createElement("p");
    message.textContent = `Chrome nu poate afișa acest tip de fișier (${extension}). Îl poți descărca folosind butonul „Descarcă” din partea de sus.`;
    unsupported.append(heading, message);
    unsupported.hidden = false;
  }
}

function closePreview() {
  $("preview-modal").hidden = true;
  const video = $("preview-video");
  video.pause();
  video.removeAttribute("src");
  video.load();
  $("preview-image").removeAttribute("src");
  $("preview-pdf").removeAttribute("src");
  const audio = $("preview-audio");
  const audioIsPlaying = !audio.paused;
  audio.hidden = true;
  if (audioIsPlaying) {
    $("mini-audio-title").textContent = state.audioItem?.name || "Redare audio";
    $("mini-audio-player").hidden = false;
  }
}

function stepMedia(direction) {
  if (state.previewItem?.kind === "image") {
    if (state.imagePlaylist.length < 2) return;
    state.imageIndex = (state.imageIndex + direction + state.imagePlaylist.length) % state.imagePlaylist.length;
    showPreview(state.imagePlaylist[state.imageIndex]);
    return;
  }
  if (["pdf", "text"].includes(state.previewItem?.kind)) {
    if (state.documentPlaylist.length < 2) return;
    state.documentIndex = (state.documentIndex + direction + state.documentPlaylist.length) % state.documentPlaylist.length;
    showPreview(state.documentPlaylist[state.documentIndex]);
    return;
  }
  if (state.mediaPlaylist.length < 2) return;
  state.mediaIndex = (state.mediaIndex + direction + state.mediaPlaylist.length) % state.mediaPlaylist.length;
  showPreview(state.mediaPlaylist[state.mediaIndex]);
}

function playNextMedia() {
  if (!state.playAllActive) return;
  if (state.mediaIndex + 1 < state.mediaPlaylist.length) {
    state.mediaIndex += 1;
    showPreview(state.mediaPlaylist[state.mediaIndex]);
  } else {
    state.playAllActive = false;
  }
}

function playAllMedia() {
  state.mediaPlaylist = state.entries
    .filter((entry) => entry.type !== "folder" && ["audio", "video"].includes(previewType(entry.name)))
    .map((entry) => ({ ...entry, path: entryPath(entry), kind: previewType(entry.name) }));
  if (!state.mediaPlaylist.length) return;
  state.mediaIndex = 0;
  state.playAllActive = true;
  showPreview(state.mediaPlaylist[0]);
}

function appendMarkdownInline(parent, value) {
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parent.append(document.createTextNode(value.slice(cursor, index)));
    if (match[1]) {
      const strong = document.createElement("strong");
      strong.textContent = match[1];
      parent.append(strong);
    } else if (match[2]) {
      const code = document.createElement("code");
      code.textContent = match[2];
      parent.append(code);
    } else {
      const label = match[3];
      const href = match[4];
      if (/^(https?:\/\/|\/)/i.test(href)) {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        if (/^https?:\/\//i.test(href)) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
        parent.append(link);
      } else parent.append(document.createTextNode(label));
    }
    cursor = index + match[0].length;
  }
  if (cursor < value.length) parent.append(document.createTextNode(value.slice(cursor)));
}

function renderReadme(markdown) {
  const target = $("readme-content");
  target.replaceChildren();
  const lines = markdown.replace(/\r/g, "").split("\n");
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("```")) {
      index += 1;
      const codeLines = [];
      while (index < lines.length && !lines[index].trim().startsWith("```")) codeLines.push(lines[index++]);
      if (index < lines.length) index += 1;
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      pre.append(code);
      target.append(pre);
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const element = document.createElement(`h${heading[1].length}`);
      appendMarkdownInline(element, heading[2]);
      target.append(element);
      index += 1;
      continue;
    }
    if (/^[-*_]{3,}$/.test(line)) { target.append(document.createElement("hr")); index += 1; continue; }
    if (/^>\s?/.test(line)) {
      const quote = document.createElement("blockquote");
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        const paragraph = document.createElement("p");
        appendMarkdownInline(paragraph, lines[index++].trim().replace(/^>\s?/, ""));
        quote.append(paragraph);
      }
      target.append(quote);
      continue;
    }
    const listMatch = /^([-*+]\s+|\d+\.\s+)/.exec(line);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[0]);
      const list = document.createElement(ordered ? "ol" : "ul");
      while (index < lines.length) {
        const itemMatch = /^\s*([-*+]\s+|\d+\.\s+)(.+)$/.exec(lines[index]);
        if (!itemMatch || /^\d/.test(itemMatch[1]) !== ordered) break;
        const item = document.createElement("li");
        appendMarkdownInline(item, itemMatch[2]);
        list.append(item);
        index += 1;
      }
      target.append(list);
      continue;
    }
    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,3}\s|```|>|[-*+]\s+|\d+\.\s+)/.test(lines[index].trim())) {
      paragraphLines.push(lines[index++].trim());
    }
    const paragraph = document.createElement("p");
    appendMarkdownInline(paragraph, paragraphLines.join(" "));
    target.append(paragraph);
  }
}

async function openReadme() {
  const modal = $("readme-modal");
  const content = $("readme-content");
  modal.hidden = false;
  content.textContent = "Se încarcă documentația…";
  try {
    const response = await fetch("/api/readme", { cache: "no-store" });
    if (!response.ok) throw new Error(`Eroare HTTP ${response.status}`);
    renderReadme(await response.text());
  } catch (error) {
    content.textContent = `Documentația nu a putut fi încărcată: ${error.message}`;
  }
}

function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function pathFor(name) { return [state.path, name].filter(Boolean).join("/"); }
function entryPath(entry) { return entry.path || pathFor(entry.name); }
function topLevelPaths(paths) {
  const ordered = [...new Set(paths)].sort((a, b) => a.length - b.length);
  const result = [];
  for (const candidate of ordered) {
    if (!result.some((parent) => candidate.startsWith(`${parent}/`))) result.push(candidate);
  }
  return result;
}

function renderBreadcrumbs() {
  const nav = $("breadcrumbs");
  nav.replaceChildren();
  const parts = state.path ? state.path.split("/") : [];
  $("back-folder").disabled = parts.length === 0;
  const add = (label, path, current = false) => {
    if (nav.childElementCount) {
      const sep = document.createElement("span");
      sep.className = "crumb-sep";
      sep.textContent = "/";
      nav.append(sep);
    }
    const button = document.createElement("button");
    button.className = `crumb${current ? " current" : ""}`;
    button.textContent = label;
    button.type = "button";
    button.addEventListener("click", () => navigate(path));
    nav.append(button);
  };
  add("Fișiere", "", parts.length === 0);
  let path = "";
  parts.forEach((part, index) => {
    path = [path, part].filter(Boolean).join("/");
    add(part, path, index === parts.length - 1);
  });
}

function visibleEntries() {
  const query = state.query.trim().toLocaleLowerCase("ro");
  const source = state.globalSearch && query ? state.globalResults : state.entries;
  const entries = source.filter((entry) => state.globalSearch && query.length >= 2 || !query || entry.name.toLocaleLowerCase("ro").includes(query));
  const key = state.sort;
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    let result;
    if (key === "size") result = (a.size || 0) - (b.size || 0);
    else if (key === "modified") result = new Date(a.modified) - new Date(b.modified);
    else if (key === "type") result = fileKind(a).localeCompare(fileKind(b)) || a.name.localeCompare(b.name, "ro");
    else result = a.name.localeCompare(b.name, "ro", { numeric: true, sensitivity: "base" });
    return state.descending ? -result : result;
  });
  return entries;
}

function actionButton(kind, label, callback) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `row-action ${kind === "delete" ? "delete" : ""}`;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.append(icon(kind));
  button.addEventListener("click", (event) => { event.stopPropagation(); callback(); });
  return button;
}

function createName(entry, rel) {
  const wrap = document.createElement("div");
  wrap.className = "name-cell";
  const kind = fileKind(entry);
  const badge = document.createElement("span");
  badge.className = `file-type-icon ${kind}`;
  badge.append(icon(kind));
  const copy = document.createElement("span");
  copy.className = "name-copy";
  const title = document.createElement("button");
  title.className = "file-name";
  title.type = "button";
  title.textContent = entry.name;
  title.title = entry.name;
  title.title = entry.type === "folder" ? `${entry.name} — dublu-click pentru deschidere` : `${entry.name} — dublu-click pentru preview`;
  if (entry.type === "folder") {
    title.addEventListener("keydown", (event) => { if (event.key === "Enter") navigate(rel); });
  } else {
    title.addEventListener("keydown", (event) => { if (event.key === "Enter") openPreview(rel, entry); });
  }
  const subtitle = document.createElement("small");
  subtitle.textContent = entry.path ? `${entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "Rădăcină"} · ${entry.type === "folder" ? "Folder" : fileKind(entry).toUpperCase()}` : entry.type === "folder" ? "Folder" : fileKind(entry).toUpperCase();
  copy.append(title, subtitle);
  wrap.append(badge, copy);
  return wrap;
}

function createCheckbox(rel) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "row-check";
  checkbox.checked = state.selected.has(rel);
  checkbox.setAttribute("aria-label", "Selectează elementul");
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) state.selected.add(rel); else state.selected.delete(rel);
    state.lastSelectedPath = rel;
    renderSelection();
  });
  return checkbox;
}

function renderEntries() {
  const visible = visibleEntries();
  const list = $("file-list");
  list.replaceChildren();
  $("grid-list").replaceChildren();
  for (const entry of visible) {
    const rel = entryPath(entry);
    const kind = fileKind(entry);
    const row = document.createElement("tr");
    row.dataset.path = rel;
    row.className = state.selected.has(rel) ? "selected" : "";
    const checkCell = document.createElement("td");
    checkCell.className = "check-col";
    checkCell.append(createCheckbox(rel));
    const nameCell = document.createElement("td");
    nameCell.append(createName(entry, rel));
    const sizeCell = document.createElement("td");
    sizeCell.className = "muted-cell";
    sizeCell.textContent = entry.type === "folder" ? "—" : formatSize(entry.size);
    const typeCell = document.createElement("td");
    typeCell.innerHTML = `<span class="type-pill ${kind}">${kind === "folder" ? "Folder" : kind.toUpperCase()}</span>`;
    const modifiedCell = document.createElement("td");
    modifiedCell.className = "muted-cell date-cell";
    modifiedCell.textContent = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.modified));
    const actionsCell = document.createElement("td");
    actionsCell.className = "table-actions-col";
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(actionButton("download", "Descarcă", () => startDownload(rel, entry)));
    actions.append(actionButton("delete", "Șterge", () => remove(rel, entry)));
    actionsCell.append(actions);
    row.append(checkCell, nameCell, sizeCell, typeCell, modifiedCell, actionsCell);
    row.addEventListener("dblclick", (event) => {
      if (event.target.closest(".row-actions, .row-check")) return;
      if (entry.type === "folder") navigate(rel);
      else openPreview(rel, entry);
    });
    row.addEventListener("click", (event) => selectEntry(rel, event));
    row.addEventListener("contextmenu", (event) => openContextMenu(event, entry, rel));
    list.append(row);

    const card = document.createElement("article");
    card.dataset.path = rel;
    card.className = `file-card${state.selected.has(rel) ? " selected" : ""}`;
    const cardHead = document.createElement("div");
    cardHead.className = "file-card-head";
    cardHead.append(createCheckbox(rel));
    const cardMenu = document.createElement("div");
    cardMenu.className = "row-actions";
    cardMenu.append(actionButton("download", "Descarcă", () => startDownload(rel, entry)));
    cardMenu.append(actionButton("delete", "Șterge", () => remove(rel, entry)));
    cardHead.append(cardMenu);
    const cardIcon = document.createElement("div");
    cardIcon.className = `card-file-icon ${kind}`;
    if (kind === "image" && isPreviewable(entry.name) && entry.size <= 20 * 1024 * 1024) {
      const thumbnail = document.createElement("img");
      thumbnail.src = previewUrl(rel);
      thumbnail.alt = "";
      thumbnail.loading = "lazy";
      cardIcon.append(thumbnail);
    } else cardIcon.append(icon(kind));
    const cardName = document.createElement("button");
    cardName.type = "button";
    cardName.className = "card-file-name";
    cardName.textContent = entry.name;
    cardName.title = entry.name;
    cardName.title = entry.type === "folder" ? `${entry.name} — dublu-click pentru deschidere` : `${entry.name} — dublu-click pentru previzualizare sau detalii`;
    if (entry.type === "folder") {
      cardName.addEventListener("keydown", (event) => { if (event.key === "Enter") navigate(rel); });
    } else {
      cardName.addEventListener("keydown", (event) => { if (event.key === "Enter") openPreview(rel, entry); });
    }
    const cardMeta = document.createElement("span");
    cardMeta.className = "card-file-meta";
    cardMeta.textContent = entry.path ? `${entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "Rădăcină"} · ${entry.type === "folder" ? "Folder" : `${formatSize(entry.size)} · ${kind.toUpperCase()}`}` : entry.type === "folder" ? "Folder" : `${formatSize(entry.size)} · ${kind.toUpperCase()}`;
    card.append(cardHead, cardIcon, cardName, cardMeta);
    card.addEventListener("dblclick", (event) => {
      if (event.target.closest(".row-actions, .row-check")) return;
      if (entry.type === "folder") navigate(rel);
      else openPreview(rel, entry);
    });
    card.addEventListener("click", (event) => selectEntry(rel, event));
    card.addEventListener("contextmenu", (event) => openContextMenu(event, entry, rel));
    $("grid-list").append(card);
  }

  const isEmpty = visible.length === 0;
  $("empty-state").hidden = !isEmpty;
  $("empty-title").textContent = state.query ? "Niciun rezultat" : "Acest folder este gol";
  $("empty-copy").textContent = state.globalSearch && state.query.trim().length < 2 ? "Introdu cel puțin 2 caractere pentru căutarea globală." : state.query ? state.globalSearch ? "Nu s-au găsit potriviri în spațiul de stocare." : "Încearcă alt termen de căutare." : "Încarcă fișiere sau creează un folder pentru a începe.";
  $("empty-upload").hidden = Boolean(state.query);
  $("nav-count").textContent = state.entries.length;
  $("play-media").hidden = state.globalSearch || !state.entries.some((entry) => entry.type !== "folder" && ["audio", "video"].includes(previewType(entry.name)));
  renderSelection(visible);
}

function renderSelection(visible = visibleEntries()) {
  for (const row of $("file-list").querySelectorAll("tr[data-path]")) {
    const selected = state.selected.has(row.dataset.path);
    row.classList.toggle("selected", selected);
    const checkbox = row.querySelector(".row-check");
    if (checkbox) checkbox.checked = selected;
  }
  for (const card of $("grid-list").querySelectorAll(".file-card[data-path]")) {
    const selected = state.selected.has(card.dataset.path);
    card.classList.toggle("selected", selected);
    const checkbox = card.querySelector(".row-check");
    if (checkbox) checkbox.checked = selected;
  }
  const selected = state.selected.size;
  $("selection-bar").hidden = selected === 0;
  $("download-selected").hidden = selected === 0;
  $("move-selected").hidden = selected === 0;
  $("delete-selected").hidden = selected === 0;
  $("selected-count").textContent = selected;
  $("selection-label").textContent = `${selected} ${selected === 1 ? "element selectat" : "elemente selectate"}`;
  const checkableVisible = visible.map(entryPath);
  $("select-all").checked = checkableVisible.length > 0 && checkableVisible.every((rel) => state.selected.has(rel));
  $("select-all").indeterminate = checkableVisible.some((rel) => state.selected.has(rel)) && !$("select-all").checked;
}

function selectEntry(rel, event) {
  if (event.target.closest(".row-actions, .row-check")) return;
  const paths = visibleEntries().map(entryPath);
  if (event.shiftKey && state.lastSelectedPath && paths.includes(state.lastSelectedPath)) {
    if (!event.ctrlKey && !event.metaKey) state.selected.clear();
    const start = paths.indexOf(state.lastSelectedPath);
    const end = paths.indexOf(rel);
    for (const path of paths.slice(Math.min(start, end), Math.max(start, end) + 1)) state.selected.add(path);
  } else if (event.ctrlKey || event.metaKey) {
    if (state.selected.has(rel)) state.selected.delete(rel); else state.selected.add(rel);
    state.lastSelectedPath = rel;
  } else {
    state.selected.clear();
    state.selected.add(rel);
    state.lastSelectedPath = rel;
  }
  renderSelection();
}

function closeContextMenu() {
  $("context-menu").hidden = true;
  state.contextMenuEntry = null;
}

function addContextMenuItem(label, callback, { danger = false, disabled = false, shortcut = "" } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `context-menu-item${danger ? " danger" : ""}`;
  button.setAttribute("role", "menuitem");
  button.disabled = disabled;
  const text = document.createElement("span");
  text.textContent = label;
  button.append(text);
  if (shortcut) {
    const hint = document.createElement("small");
    hint.textContent = shortcut;
    button.append(hint);
  }
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeContextMenu();
    if (!disabled) callback();
  });
  $("context-menu").append(button);
}

function addContextSeparator() {
  const separator = document.createElement("div");
  separator.className = "context-menu-separator";
  separator.setAttribute("role", "separator");
  $("context-menu").append(separator);
}

function openContextMenu(event, entry, rel) {
  event.preventDefault();
  event.stopPropagation();
  if (!state.selected.has(rel)) {
    state.selected.clear();
    state.selected.add(rel);
    state.lastSelectedPath = rel;
    renderSelection();
  }
  state.contextMenuEntry = { entry, rel };
  const menu = $("context-menu");
  menu.replaceChildren();
  const selectedPaths = [...state.selected];
  const multiple = selectedPaths.length > 1;
  const current = state.contextMenuEntry;
  if (!multiple) {
    addContextMenuItem(current.entry.type === "folder" ? "Deschide folderul" : "Previzualizează / detalii", () => {
      if (current.entry.type === "folder") navigate(current.rel); else openPreview(current.rel, current.entry);
    }, { shortcut: "Enter" });
    addContextMenuItem("Descarcă", () => startDownload(current.rel, current.entry));
    addContextSeparator();
    addContextMenuItem("Redenumește", () => renameEntry(current.rel, current.entry), { shortcut: "F2" });
    addContextMenuItem("Copiază în…", () => { state.selected = new Set([current.rel]); renderSelection(); void openTargetDialog("copy").catch((error) => toast(error.message, true)); });
    addContextMenuItem("Mută în…", () => { state.selected = new Set([current.rel]); renderSelection(); void openTargetDialog("move").catch((error) => toast(error.message, true)); });
    addContextSeparator();
    addContextMenuItem("Șterge", () => remove(current.rel, current.entry), { danger: true, shortcut: "Delete" });
  } else {
    addContextMenuItem(`Descarcă selectatele (${selectedPaths.length})`, downloadSelected);
    addContextMenuItem("Copiază selectatele în…", () => { void openTargetDialog("copy").catch((error) => toast(error.message, true)); });
    addContextMenuItem("Mută selectatele în…", () => { void openTargetDialog("move").catch((error) => toast(error.message, true)); });
    addContextSeparator();
    addContextMenuItem(`Șterge selectatele (${selectedPaths.length})`, deleteSelected, { danger: true, shortcut: "Delete" });
  }
  addContextSeparator();
  addContextMenuItem("Selectează tot", () => {
    for (const item of visibleEntries()) state.selected.add(entryPath(item));
    renderSelection();
  });
  addContextMenuItem("Anulează selecția", () => { state.selected.clear(); renderSelection(); }, { disabled: selectedPaths.length === 0 });
  menu.hidden = false;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))}px`;
  menu.querySelector("button:not(:disabled)")?.focus();
}

function selectedEntryForPath(rel) {
  return [...state.entries, ...state.globalResults].find((entry) => entryPath(entry) === rel);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeContextMenu(); return; }
  if (!$("context-menu").hidden || event.target.closest("input, textarea, select, [contenteditable='true'], .file-name, .card-file-name")) return;
  const paths = [...state.selected];
  if (event.key === "F2" && paths.length === 1) {
    const entry = selectedEntryForPath(paths[0]);
    if (entry) { event.preventDefault(); void renameEntry(paths[0], entry); }
  } else if (event.key === "Delete" && paths.length) {
    event.preventDefault();
    if (paths.length === 1) {
      const entry = selectedEntryForPath(paths[0]);
      if (entry) void remove(paths[0], entry);
    } else void deleteSelected();
  }
});

async function navigate(path = state.path) {
  if (state.globalSearch && path !== state.path) {
    state.globalSearch = false;
    state.globalResults = [];
    state.query = "";
    state.searchToken += 1;
    $("search").value = "";
    updateSearchScope();
  }
  $("loading-state").hidden = false;
  $("empty-state").hidden = true;
  $("file-list").replaceChildren();
  try {
    const result = await api(`/api/list?path=${encodeURIComponent(path)}`);
    state.path = result.path;
    state.entries = result.entries;
    state.selected.clear();
    state.lastSelectedPath = null;
    renderBreadcrumbs();
    renderEntries();
  } catch (error) { toast(error.message, true); }
  finally { $("loading-state").hidden = true; }
  if (state.globalSearch && state.query.trim().length >= 2) await runGlobalSearch();
}

function updateSearchScope() {
  const button = $("search-scope");
  button.textContent = state.globalSearch ? "Tot spațiul" : "Folder curent";
  button.setAttribute("aria-pressed", String(state.globalSearch));
  button.title = state.globalSearch ? "Caută în toate folderele; click pentru căutare locală" : "Click pentru a căuta în toate folderele";
  $("search").placeholder = state.globalSearch ? "Caută în toate folderele" : "Caută în acest folder";
}

async function runGlobalSearch() {
  const query = state.query.trim();
  const token = ++state.searchToken;
  if (query.length < 2) {
    state.globalResults = [];
    renderEntries();
    return;
  }
  $("loading-state").hidden = false;
  try {
    const result = await api(`/api/search?q=${encodeURIComponent(query)}`);
    if (token !== state.searchToken) return;
    state.globalResults = result.entries;
    renderEntries();
    if (result.truncated) toast("Afișez primele 1.000 de rezultate. Rafinează căutarea pentru mai multe potriviri.");
  } catch (error) {
    if (token === state.searchToken) toast(error.message, true);
  } finally {
    if (token === state.searchToken) $("loading-state").hidden = true;
  }
}

function navigateBack() {
  if (!state.path) return;
  const parent = state.path.split("/").slice(0, -1).join("/");
  void navigate(parent);
}

async function createFolder() {
  const name = prompt("Numele folderului nou:");
  if (name === null) return;
  if (!name.trim()) return toast("Introdu un nume pentru folder.", true);
  try {
    await api("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: state.path, name: name.trim() }) });
    toast("Folderul a fost creat.");
    await navigate();
  } catch (error) { toast(error.message, true); }
}

function closeRenameDialog() {
  $("rename-dialog").hidden = true;
  state.pendingRename = null;
}

function renameEntry(rel, entry) {
  state.pendingRename = { rel, entry };
  $("rename-description").textContent = entry.type === "folder" ? "Introdu numele nou pentru folder." : "Introdu numele nou pentru fișier.";
  $("rename-input").value = entry.name;
  $("rename-error").hidden = true;
  $("rename-error").textContent = "";
  $("rename-dialog").hidden = false;
  $("rename-input").focus();
  $("rename-input").select();
}

async function confirmRename() {
  if (!state.pendingRename) return;
  const { rel, entry } = state.pendingRename;
  const name = $("rename-input").value.trim();
  const error = $("rename-error");
  if (!name) { error.textContent = "Numele nu poate fi gol."; error.hidden = false; return; }
  if (name === entry.name) { closeRenameDialog(); return; }
  const button = $("rename-confirm");
  button.disabled = true;
  error.hidden = true;
  try {
    await api("/api/rename", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: rel, name }) });
    closeRenameDialog();
    state.selected.delete(rel);
    toast("Elementul a fost redenumit.");
    await navigate();
  } catch (requestError) {
    error.textContent = requestError.message;
    error.hidden = false;
  } finally { button.disabled = false; }
}

function closeDeleteDialog() {
  $("delete-dialog").hidden = true;
  state.pendingDelete = [];
}

function openDeleteDialog(items) {
  state.pendingDelete = items;
  const list = $("delete-list");
  list.replaceChildren();
  for (const item of items.slice(0, 8)) {
    const row = document.createElement("li");
    row.textContent = item.entry?.name || item.rel.split("/").pop();
    list.append(row);
  }
  if (items.length > 8) {
    const more = document.createElement("li");
    more.textContent = `și încă ${items.length - 8} elemente`;
    list.append(more);
  }
  if (items.length === 1) {
    const entry = items[0].entry;
    $("delete-title").textContent = entry?.type === "folder" ? "Șterge folderul" : "Șterge fișierul";
    $("delete-description").textContent = entry?.type === "folder"
      ? "Folderul și tot conținutul lui vor fi șterse definitiv. Acțiunea nu poate fi anulată."
      : "Fișierul va fi șters definitiv. Acțiunea nu poate fi anulată.";
  } else {
    $("delete-title").textContent = `Șterge ${items.length} elemente`;
    const containsFolder = items.some((item) => item.entry?.type === "folder");
    $("delete-description").textContent = containsFolder
      ? "Folderele selectate și tot conținutul lor vor fi șterse definitiv. Acțiunea nu poate fi anulată."
      : "Elementele selectate vor fi șterse definitiv. Acțiunea nu poate fi anulată.";
  }
  $("delete-error").hidden = true;
  $("delete-error").textContent = "";
  $("delete-confirm").disabled = false;
  $("delete-cancel").disabled = false;
  $("delete-dialog").hidden = false;
  $("delete-cancel").focus();
}

function remove(rel, entry) {
  openDeleteDialog([{ rel, entry }]);
}

function deleteSelected() {
  const paths = topLevelPaths([...state.selected]);
  if (!paths.length) return;
  const items = paths.map((rel) => ({ rel, entry: selectedEntryForPath(rel) }));
  openDeleteDialog(items);
}

async function confirmDelete() {
  const items = state.pendingDelete;
  if (!items.length) return;
  const confirmButton = $("delete-confirm");
  confirmButton.disabled = true;
  $("delete-cancel").disabled = true;
  $("delete-error").hidden = true;
  let removed = 0;
  const errors = [];
  for (const item of items) {
    try {
      await api(`/api/delete?path=${encodeURIComponent(item.rel)}`, { method: "DELETE" });
      removed += 1;
    } catch (error) { errors.push(`${item.entry?.name || item.rel}: ${error.message}`); }
  }
  closeDeleteDialog();
  $("delete-cancel").disabled = false;
  state.selected.clear();
  if (errors.length) toast(`${removed} șterse. ${errors.join("; ")}`, true);
  else toast(`${removed} ${removed === 1 ? "element șters" : "elemente șterse"}.`);
  await navigate();
  await refreshUsage();
}

function closeMoveDialog() { $("move-dialog").hidden = true; }

async function openTargetDialog(mode) {
  state.targetAction = mode;
  const selected = topLevelPaths([...state.selected]);
  const knownEntries = [...state.entries, ...state.globalResults];
  const entryMap = new Map(knownEntries.map((entry) => [entryPath(entry), entry]));
  const selectedEntries = selected.map((rel) => ({ rel, entry: entryMap.get(rel) })).filter((item) => item.entry);
  const result = await api("/api/folders");
  const select = $("move-destination");
  select.replaceChildren();
  const candidates = [{ path: "", name: "Rădăcină / Fișiere" }, ...result.folders]
    .filter((folder) => mode === "copy" || !selectedEntries.some(({ rel }) => (rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "") === folder.path))
    .filter((folder) => !selectedEntries.some(({ entry, rel }) => entry.type === "folder" && (folder.path === rel || folder.path.startsWith(`${rel}/`))))
    .sort((a, b) => (a.path ? 1 : -1) - (b.path ? 1 : -1) || a.path.localeCompare(b.path, "ro", { sensitivity: "base" }));
  for (const folder of candidates) {
    const option = document.createElement("option");
    option.value = folder.path;
    const depth = folder.path ? folder.path.split("/").length : 0;
    option.textContent = `${"　".repeat(depth)}${folder.path ? folder.name : folder.name}`;
    select.append(option);
  }
  $("move-title").textContent = mode === "copy" ? "Copiază elementele selectate" : "Mută elementele selectate";
  $("move-description").textContent = `${selected.length} ${selected.length === 1 ? "element selectat" : "elemente selectate"}. Alege folderul de destinație.${mode === "copy" ? " Dacă numele există deja, se creează automat o copie cu nume nou." : ""}`;
  $("move-confirm").textContent = mode === "copy" ? "Copiază" : "Mută";
  $("move-confirm").disabled = candidates.length === 0;
  if (!candidates.length) {
    const option = document.createElement("option");
    option.textContent = "Nu există alt folder disponibil";
    option.value = "";
    select.append(option);
  }
  $("move-dialog").hidden = false;
  select.focus();
}

async function moveSelected() {
  const sources = topLevelPaths([...state.selected]);
  if (!sources.length) return;
  try {
    const result = await api("/api/move", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources, destination: $("move-destination").value }),
    });
    closeMoveDialog();
    toast(`${result.moved} ${result.moved === 1 ? "element mutat" : "elemente mutate"}.`);
    await navigate();
  } catch (error) { toast(error.message, true); }
}

async function copySelected() {
  const sources = topLevelPaths([...state.selected]);
  if (!sources.length) return;
  try {
    const result = await api("/api/copy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources, destination: $("move-destination").value }),
    });
    closeMoveDialog();
    state.selected.clear();
    toast(`${result.copied} ${result.copied === 1 ? "element copiat" : "elemente copiate"}.`);
    await navigate();
    await refreshUsage();
  } catch (error) { toast(error.message, true); }
}

function confirmTargetAction() {
  if (state.targetAction === "copy") void copySelected(); else void moveSelected();
}

function transferItem(kind, name, total = 0) {
  const item = {
    id: ++state.transferId, kind, name, total: Number(total) || 0, loaded: 0,
    status: "active", started: performance.now(), rate: 0, cancel: null, cancellable: true,
  };
  state.transfers.set(item.id, item);
  renderTransfers();
  return item;
}

function scheduleTransferRender() {
  if (state.transferFrame) return;
  state.transferFrame = requestAnimationFrame(() => { state.transferFrame = 0; renderTransfers(); });
}

function renderTransfers() {
  const panel = $("transfer-panel");
  const list = $("transfer-list");
  const items = [...state.transfers.values()].slice(-8).reverse();
  const active = [...state.transfers.values()].filter((item) => item.status === "active").length;
  $("transfer-badge").hidden = active === 0;
  $("transfer-badge").textContent = active;
  $("transfer-summary").textContent = active ? `${active} transfer${active === 1 ? " activ" : "uri active"}` : "Activitate recentă";
  if (!items.length) { panel.hidden = true; return; }
  list.replaceChildren();
  for (const item of items) {
    const row = document.createElement("article");
    row.className = `transfer-item ${item.status}`;
    const top = document.createElement("div");
    top.className = "transfer-item-top";
    const copy = document.createElement("div");
    copy.className = "transfer-copy";
    const name = document.createElement("strong");
    name.textContent = item.name;
    name.title = item.name;
    const detail = document.createElement("span");
    const elapsed = (performance.now() - item.started) / 1000;
    const percent = item.total ? Math.min(100, Math.floor(item.loaded / item.total * 100)) : 0;
    if (item.status === "active") detail.textContent = item.total ? `${formatSize(item.loaded)} din ${formatSize(item.total)} · ${formatRate(item.loaded, elapsed)}` : `${formatSize(item.loaded)} · Se transferă…`;
    else if (item.status === "done") detail.textContent = `${item.kind === "upload" ? "Încărcat" : "Descărcat"} · ${formatSize(item.loaded || item.total)}`;
    else if (item.status === "cancelled") detail.textContent = "Anulat";
    else detail.textContent = item.error || "Transfer eșuat";
    copy.append(name, detail);
    top.append(copy);
    if (item.status !== "active" || item.cancellable) {
      const dismiss = document.createElement("button");
      dismiss.className = "transfer-action";
      dismiss.type = "button";
      dismiss.textContent = item.status === "active" ? "×" : "✓";
      dismiss.title = item.status === "active" ? "Anulează transferul" : "Elimină din listă";
      dismiss.addEventListener("click", () => {
        if (item.status === "active") item.cancel?.();
        else state.transfers.delete(item.id);
        renderTransfers();
      });
      top.append(dismiss);
    }
    const progress = document.createElement("div");
    progress.className = `progress-track${item.status === "active" && !item.total ? " indeterminate" : ""}`;
    const bar = document.createElement("span");
    bar.style.width = item.total ? `${percent}%` : item.status === "done" ? "100%" : "35%";
    progress.append(bar);
    const bottom = document.createElement("div");
    bottom.className = "transfer-item-bottom";
    const type = document.createElement("span");
    type.textContent = item.kind === "upload" ? "ÎNCĂRCARE" : "DESCĂRCARE";
    const value = document.createElement("span");
    value.textContent = item.total ? `${percent}%` : formatSize(item.loaded);
    bottom.append(type, value);
    row.append(top, progress, bottom);
    list.append(row);
  }
  panel.hidden = false;
}

function updateTransfer(item, loaded, total = item.total) {
  item.loaded = loaded;
  if (total) item.total = total;
  item.rate = loaded / Math.max(.1, (performance.now() - item.started) / 1000);
  scheduleTransferRender();
}

function finishTransfer(item, status = "done", error = "") {
  item.status = status;
  item.error = error;
  item.cancel = null;
  renderTransfers();
}

function uploadOne(file, rel, overwrite = false) {
  return new Promise((resolve, reject) => {
    const item = transferItem("upload", file.name, file.size);
    const xhr = new XMLHttpRequest();
    item.cancel = () => xhr.abort();
    xhr.open("PUT", `/api/upload?path=${encodeURIComponent(rel)}${overwrite ? "&overwrite=1" : ""}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.addEventListener("progress", (event) => updateTransfer(item, event.loaded, event.lengthComputable ? event.total : file.size));
    xhr.addEventListener("load", async () => {
      let result = {};
      try { result = JSON.parse(xhr.responseText || "{}"); } catch {}
      if (xhr.status === 409 && result.exists) {
        state.transfers.delete(item.id);
        renderTransfers();
        if (confirm(`„${file.name}” există deja. Îl înlocuiești?`)) {
          try { resolve(await uploadOne(file, rel, true)); } catch (error) { reject(error); }
        } else resolve(false);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        updateTransfer(item, file.size, file.size);
        finishTransfer(item, "done");
        resolve(true);
      } else {
        const message = result.error || `Eroare HTTP ${xhr.status}`;
        finishTransfer(item, "error", message);
        reject(new Error(message));
      }
    });
    xhr.addEventListener("error", () => { finishTransfer(item, "error", "Conexiunea a fost întreruptă."); reject(new Error(`Eroare de rețea la încărcarea „${file.name}”.`)); });
    xhr.addEventListener("abort", () => { finishTransfer(item, "cancelled"); resolve(false); });
    xhr.send(file);
  });
}

async function uploadFiles(fileList, folderSelection = false) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  let done = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const relativeName = folderSelection ? file.webkitRelativePath : file.name;
    const rel = [state.path, relativeName].filter(Boolean).join("/");
    try {
      if (await uploadOne(file, rel)) done += 1;
    } catch (error) { toast(error.message, true); }
  }
  if (done) toast(`${done} ${done === 1 ? "fișier încărcat" : "fișiere încărcate"}.`);
  await navigate();
  await refreshUsage();
}

function filenameFromResponse(response, fallback) {
  const header = response.headers.get("content-disposition") || "";
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) { try { return decodeURIComponent(encoded[1]); } catch {} }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : fallback;
}

async function downloadRequest(request, suggestedName, fallbackSize = 0) {
  let fileHandle = null;
  if (window.showSaveFilePicker) {
    try { fileHandle = await window.showSaveFilePicker({ suggestedName }); }
    catch (error) { if (error.name === "AbortError") return; }
  }
  const item = transferItem("download", suggestedName, fallbackSize);
  const controller = new AbortController();
  item.cancel = () => controller.abort();
  let writable = null;
  try {
    const response = await request(controller.signal);
    if (!response.ok) {
      let message = `Eroare HTTP ${response.status}`;
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const total = Number(response.headers.get("content-length")) || fallbackSize || 0;
    item.total = total;
    const filename = filenameFromResponse(response, suggestedName);
    if (fileHandle) writable = await fileHandle.createWritable();
    if (!response.body) throw new Error("Browserul nu poate citi fluxul de descărcare.");
    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      item.loaded += value.byteLength;
      if (writable) await writable.write(value); else chunks.push(value);
      updateTransfer(item, item.loaded, total);
    }
    if (writable) await writable.close();
    else {
      const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    }
    finishTransfer(item, "done");
  } catch (error) {
    controller.abort();
    if (writable) { try { await writable.abort(); } catch {} }
    if (error.name === "AbortError") finishTransfer(item, "cancelled");
    else { finishTransfer(item, "error", error.message); toast(error.message, true); }
  }
}

async function downloadLargeFile(rel, entry) {
  const transferId = `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const item = transferItem("download", entry.name, entry.size || 0);
  item.cancellable = false;
  renderTransfers();
  const link = document.createElement("a");
  link.href = `/api/download?path=${encodeURIComponent(rel)}&transfer=${encodeURIComponent(transferId)}`;
  link.download = entry.name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  let missingPolls = 0;
  let failedPolls = 0;
  while (item.status === "active") {
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      const response = await fetch(`/api/download-status?id=${encodeURIComponent(transferId)}`, { cache: "no-store" });
      if (response.status === 404) {
        missingPolls += 1;
        if (missingPolls > 90) finishTransfer(item, "error", "Descărcarea nu a pornit pe server.");
        continue;
      }
      if (!response.ok) throw new Error(`Eroare HTTP ${response.status}`);
      missingPolls = 0;
      failedPolls = 0;
      const job = await response.json();
      updateTransfer(item, job.loaded, job.total);
      if (job.status === "done") finishTransfer(item, "done");
      else if (job.status === "cancelled") finishTransfer(item, "cancelled");
      else if (job.status === "error") finishTransfer(item, "error", job.error || "Descărcarea a eșuat.");
    } catch (error) {
      failedPolls += 1;
      if (failedPolls > 10) finishTransfer(item, "error", error.message);
    }
  }
}

async function startDownload(rel, entry) {
  if (entry.type === "file" && entry.size >= 2 * 1024 ** 3) {
    await downloadLargeFile(rel, entry);
    return;
  }
  const suggestedName = entry.type === "folder" ? `${entry.name}.zip` : entry.name;
  await downloadRequest((signal) => fetch(`/api/download?path=${encodeURIComponent(rel)}`, { signal }), suggestedName, entry.size || 0);
}

async function downloadSelected() {
  const paths = topLevelPaths([...state.selected]);
  if (!paths.length) return;
  await downloadRequest((signal) => fetch("/api/download-selected", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }), signal,
  }), "fisiere-selectate.zip");
}

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebar-scrim").classList.remove("visible");
}

$("theme-toggle").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
document.querySelectorAll(".accent-choice").forEach((button) => button.addEventListener("click", () => setAccent(button.dataset.accent)));
$("refresh").addEventListener("click", () => { void navigate(); void refreshUsage(); });
$("new-folder").addEventListener("click", createFolder);
$("upload-files").addEventListener("click", () => $("file-input").click());
$("upload-folder").addEventListener("click", () => $("folder-input").click());
$("back-folder").addEventListener("click", navigateBack);
$("empty-upload").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", (event) => { void uploadFiles(event.target.files); event.target.value = ""; });
$("folder-input").addEventListener("change", (event) => { void uploadFiles(event.target.files, true); event.target.value = ""; });
$("all-files").addEventListener("click", () => {
  state.globalSearch = false;
  state.globalResults = [];
  state.query = "";
  state.searchToken += 1;
  $("search").value = "";
  updateSearchScope();
  void navigate("");
});
$("search").addEventListener("input", (event) => {
  state.query = event.target.value;
  state.selected.clear();
  state.lastSelectedPath = null;
  state.searchToken += 1;
  clearTimeout(state.searchTimer);
  $("loading-state").hidden = true;
  if (!state.globalSearch) { renderEntries(); return; }
  state.globalResults = [];
  renderEntries();
  state.searchTimer = setTimeout(() => { void runGlobalSearch(); }, 240);
});
$("search-scope").addEventListener("click", () => {
  state.globalSearch = !state.globalSearch;
  state.globalResults = [];
  state.selected.clear();
  state.lastSelectedPath = null;
  state.searchToken += 1;
  clearTimeout(state.searchTimer);
  updateSearchScope();
  renderEntries();
  if (state.globalSearch) void runGlobalSearch();
});
$("sort").addEventListener("change", (event) => { state.sort = event.target.value; renderEntries(); });
$("select-all").addEventListener("change", (event) => {
  for (const entry of visibleEntries()) {
    const rel = entryPath(entry);
    if (event.target.checked) state.selected.add(rel); else state.selected.delete(rel);
  }
  renderEntries();
});
$("delete-selected").addEventListener("click", deleteSelected);
$("download-selected").addEventListener("click", downloadSelected);
$("move-selected").addEventListener("click", () => { void openTargetDialog("move").catch((error) => toast(error.message, true)); });
$("move-cancel").addEventListener("click", closeMoveDialog);
$("move-confirm").addEventListener("click", confirmTargetAction);
$("move-dialog").addEventListener("click", (event) => { if (event.target === $("move-dialog")) closeMoveDialog(); });
$("rename-cancel").addEventListener("click", closeRenameDialog);
$("rename-confirm").addEventListener("click", confirmRename);
$("rename-input").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); void confirmRename(); } });
$("rename-dialog").addEventListener("click", (event) => { if (event.target === $("rename-dialog")) closeRenameDialog(); });
$("delete-cancel").addEventListener("click", closeDeleteDialog);
$("delete-confirm").addEventListener("click", confirmDelete);
$("delete-dialog").addEventListener("click", (event) => { if (event.target === $("delete-dialog") && !$("delete-confirm").disabled) closeDeleteDialog(); });
document.addEventListener("pointerdown", (event) => { if (!event.target.closest("#context-menu")) closeContextMenu(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeContextMenu(); });
window.addEventListener("resize", closeContextMenu);
window.addEventListener("scroll", closeContextMenu, true);
$("context-menu").addEventListener("contextmenu", (event) => event.preventDefault());
$("play-media").addEventListener("click", playAllMedia);
$("preview-close").addEventListener("click", closePreview);
$("preview-modal").addEventListener("click", (event) => { if (event.target === $("preview-modal")) closePreview(); });
$("preview-previous").addEventListener("click", () => stepMedia(-1));
$("preview-next").addEventListener("click", () => stepMedia(1));
$("image-zoom-in").addEventListener("click", () => {
  state.imageZoom = Math.min(3, state.imageZoom + .25);
  $("preview-image").style.transform = `scale(${state.imageZoom}) rotate(${state.imageRotation}deg)`;
  $("image-zoom-reset").textContent = `${Math.round(state.imageZoom * 100)}%`;
});
$("image-zoom-out").addEventListener("click", () => {
  state.imageZoom = Math.max(.5, state.imageZoom - .25);
  $("preview-image").style.transform = `scale(${state.imageZoom}) rotate(${state.imageRotation}deg)`;
  $("image-zoom-reset").textContent = `${Math.round(state.imageZoom * 100)}%`;
});
$("image-zoom-reset").addEventListener("click", () => {
  state.imageZoom = 1;
  $("preview-image").style.transform = `scale(1) rotate(${state.imageRotation}deg)`;
  $("image-zoom-reset").textContent = "100%";
});
$("image-rotate").addEventListener("click", () => {
  state.imageRotation = (state.imageRotation + 90) % 360;
  $("preview-image").style.transform = `scale(${state.imageZoom}) rotate(${state.imageRotation}deg)`;
});
$("preview-audio").addEventListener("play", () => { $("mini-audio-play").textContent = "Ⅱ"; });
$("preview-audio").addEventListener("pause", () => { $("mini-audio-play").textContent = "▶"; });
$("preview-audio").addEventListener("timeupdate", () => {
  const audio = $("preview-audio");
  const percent = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
  $("mini-audio-progress-fill").style.width = `${percent}%`;
  $("mini-audio-time").textContent = `${formatMediaTime(audio.currentTime)} / ${formatMediaTime(audio.duration)}`;
});
$("preview-audio").addEventListener("loadedmetadata", () => {
  const audio = $("preview-audio");
  $("mini-audio-time").textContent = `0:00 / ${formatMediaTime(audio.duration)}`;
});
$("mini-audio-play").addEventListener("click", () => {
  const audio = $("preview-audio");
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
});
$("mini-audio-open").addEventListener("click", () => {
  if (!state.audioItem) return;
  openPreview(state.audioItem.path, state.audioItem);
});
$("mini-audio-close").addEventListener("click", () => {
  const audio = $("preview-audio");
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  $("mini-audio-player").hidden = true;
  state.playAllActive = false;
});
$("mini-audio-progress-fill").parentElement.addEventListener("click", (event) => {
  const audio = $("preview-audio");
  const bounds = event.currentTarget.getBoundingClientRect();
  if (audio.duration && bounds.width) audio.currentTime = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * audio.duration;
});
$("clear-selection").addEventListener("click", () => { state.selected.clear(); renderEntries(); });
$("list-view").addEventListener("click", () => {
  state.view = "list"; $("table-scroll").hidden = false; $("grid-list").hidden = true;
  $("list-view").classList.add("active"); $("grid-view").classList.remove("active");
});
$("grid-view").addEventListener("click", () => {
  state.view = "grid"; $("table-scroll").hidden = true; $("grid-list").hidden = false;
  $("grid-view").classList.add("active"); $("list-view").classList.remove("active");
});
$("transfers-toggle").addEventListener("click", () => { $("transfer-panel").hidden = !$("transfer-panel").hidden; });
$("transfer-close").addEventListener("click", () => { $("transfer-panel").hidden = true; });
$("mobile-menu").addEventListener("click", () => { $("sidebar").classList.add("open"); $("sidebar-scrim").classList.add("visible"); });
$("sidebar-close").addEventListener("click", closeSidebar);
$("sidebar-scrim").addEventListener("click", closeSidebar);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeSidebar(); $("logo-lightbox").hidden = true; $("readme-modal").hidden = true; closeMoveDialog(); closeRenameDialog(); closeDeleteDialog(); closePreview(); }
});

$("logo-open").addEventListener("click", () => { $("logo-lightbox").hidden = false; });
$("logo-lightbox").addEventListener("click", () => { $("logo-lightbox").hidden = true; });
$("readme-open").addEventListener("click", () => { void openReadme(); });
$("readme-close").addEventListener("click", () => { $("readme-modal").hidden = true; });
$("readme-modal").addEventListener("click", (event) => { if (event.target === $("readme-modal")) $("readme-modal").hidden = true; });

updateSearchScope();
setTheme(localStorage.getItem("file-server-theme-v2") || "dark");
renderTransfers();
navigate("");
refreshUsage();
