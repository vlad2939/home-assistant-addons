"use strict";

const $ = (id) => document.getElementById(id);
const state = {
  path: "", entries: [], selected: new Set(), sort: "name", descending: false,
  view: "list", query: "", toastTimer: null, transfers: new Map(), transferId: 0,
  transferFrame: 0,
};
const root = document.documentElement;

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

function formatRate(bytes, elapsed) {
  if (!elapsed || bytes <= 0) return "Se pregătește…";
  return `${formatSize(bytes / elapsed)} / s`;
}

function fileKind(entry) {
  if (entry.type === "folder") return "folder";
  const ext = entry.name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) return "audio";
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) return "video";
  if (["zip", "7z", "rar", "tar", "gz", "bz2"].includes(ext)) return "archive";
  return "file";
}

function pathFor(name) { return [state.path, name].filter(Boolean).join("/"); }

function renderBreadcrumbs() {
  const nav = $("breadcrumbs");
  nav.replaceChildren();
  const parts = state.path ? state.path.split("/") : [];
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
  const entries = state.entries.filter((entry) => !query || entry.name.toLocaleLowerCase("ro").includes(query));
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
  title.title = entry.type === "folder" ? `${entry.name} — dublu-click pentru deschidere` : entry.name;
  if (entry.type === "folder") {
    title.addEventListener("dblclick", () => navigate(rel));
    title.addEventListener("keydown", (event) => { if (event.key === "Enter") navigate(rel); });
  }
  const subtitle = document.createElement("small");
  subtitle.textContent = entry.type === "folder" ? "Folder" : fileKind(entry).toUpperCase();
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
    renderEntries();
  });
  return checkbox;
}

function renderEntries() {
  const visible = visibleEntries();
  const list = $("file-list");
  list.replaceChildren();
  $("grid-list").replaceChildren();
  for (const entry of visible) {
    const rel = pathFor(entry.name);
    const kind = fileKind(entry);
    const row = document.createElement("tr");
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
    list.append(row);

    const card = document.createElement("article");
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
    cardIcon.append(icon(kind));
    const cardName = document.createElement("button");
    cardName.type = "button";
    cardName.className = "card-file-name";
    cardName.textContent = entry.name;
    cardName.title = entry.name;
    cardName.title = entry.type === "folder" ? `${entry.name} — dublu-click pentru deschidere` : entry.name;
    if (entry.type === "folder") {
      cardName.addEventListener("dblclick", () => navigate(rel));
      cardName.addEventListener("keydown", (event) => { if (event.key === "Enter") navigate(rel); });
    }
    const cardMeta = document.createElement("span");
    cardMeta.className = "card-file-meta";
    cardMeta.textContent = entry.type === "folder" ? "Folder" : `${formatSize(entry.size)} · ${kind.toUpperCase()}`;
    card.append(cardHead, cardIcon, cardName, cardMeta);
    $("grid-list").append(card);
  }

  const isEmpty = visible.length === 0;
  $("empty-state").hidden = !isEmpty;
  $("empty-title").textContent = state.query ? "Niciun rezultat" : "Acest folder este gol";
  $("empty-copy").textContent = state.query ? "Încearcă alt termen de căutare." : "Încarcă fișiere sau creează un folder pentru a începe.";
  $("empty-upload").hidden = Boolean(state.query);
  $("nav-count").textContent = state.entries.length;
  const selected = state.selected.size;
  $("selection-bar").hidden = selected === 0;
  $("delete-selected").hidden = selected === 0;
  $("selected-count").textContent = selected;
  $("selection-label").textContent = `${selected} ${selected === 1 ? "element selectat" : "elemente selectate"}`;
  const checkableVisible = visible.map((entry) => pathFor(entry.name));
  $("select-all").checked = checkableVisible.length > 0 && checkableVisible.every((rel) => state.selected.has(rel));
  $("select-all").indeterminate = checkableVisible.some((rel) => state.selected.has(rel)) && !$("select-all").checked;
}

async function navigate(path = state.path) {
  $("loading-state").hidden = false;
  $("empty-state").hidden = true;
  $("file-list").replaceChildren();
  try {
    const result = await api(`/api/list?path=${encodeURIComponent(path)}`);
    state.path = result.path;
    state.entries = result.entries;
    state.selected.clear();
    renderBreadcrumbs();
    renderEntries();
  } catch (error) { toast(error.message, true); }
  finally { $("loading-state").hidden = true; }
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

async function remove(rel, entry) {
  const subject = entry.type === "folder" ? `folderul „${entry.name}” și tot conținutul lui` : `fișierul „${entry.name}”`;
  if (!confirm(`Ștergi ${subject}? Acțiunea nu poate fi anulată.`)) return;
  try {
    await api(`/api/delete?path=${encodeURIComponent(rel)}`, { method: "DELETE" });
    state.selected.delete(rel);
    toast("Elementul a fost șters.");
    await navigate();
  } catch (error) { toast(error.message, true); }
}

async function deleteSelected() {
  const paths = [...state.selected];
  if (!paths.length || !confirm(`Ștergi definitiv cele ${paths.length} elemente selectate?`)) return;
  let removed = 0;
  for (const rel of paths) {
    try { await api(`/api/delete?path=${encodeURIComponent(rel)}`, { method: "DELETE" }); removed += 1; }
    catch (error) { toast(`${rel}: ${error.message}`, true); }
  }
  toast(`${removed} ${removed === 1 ? "element șters" : "elemente șterse"}.`);
  await navigate();
}

function transferItem(kind, name, total = 0) {
  const item = {
    id: ++state.transferId, kind, name, total: Number(total) || 0, loaded: 0,
    status: "active", started: performance.now(), rate: 0, cancel: null,
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
    top.append(copy, dismiss);
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
}

function filenameFromResponse(response, fallback) {
  const header = response.headers.get("content-disposition") || "";
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) { try { return decodeURIComponent(encoded[1]); } catch {} }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : fallback;
}

async function startDownload(rel, entry) {
  const suggestedName = entry.type === "folder" ? `${entry.name}.zip` : entry.name;
  let fileHandle = null;
  if (window.showSaveFilePicker) {
    try { fileHandle = await window.showSaveFilePicker({ suggestedName }); }
    catch (error) { if (error.name === "AbortError") return; }
  }
  const item = transferItem("download", suggestedName, entry.size || 0);
  const controller = new AbortController();
  item.cancel = () => controller.abort();
  let writable = null;
  try {
    const response = await fetch(`/api/download?path=${encodeURIComponent(rel)}`, { signal: controller.signal });
    if (!response.ok) {
      let message = `Eroare HTTP ${response.status}`;
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const total = Number(response.headers.get("content-length")) || entry.size || 0;
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

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebar-scrim").classList.remove("visible");
}

$("theme-toggle").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
$("refresh").addEventListener("click", () => navigate());
$("new-folder").addEventListener("click", createFolder);
$("upload-files").addEventListener("click", () => $("file-input").click());
$("upload-folder").addEventListener("click", () => $("folder-input").click());
$("empty-upload").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", (event) => { void uploadFiles(event.target.files); event.target.value = ""; });
$("folder-input").addEventListener("change", (event) => { void uploadFiles(event.target.files, true); event.target.value = ""; });
$("all-files").addEventListener("click", () => navigate(""));
$("search").addEventListener("input", (event) => { state.query = event.target.value; renderEntries(); });
$("sort").addEventListener("change", (event) => { state.sort = event.target.value; renderEntries(); });
$("select-all").addEventListener("change", (event) => {
  for (const entry of visibleEntries()) {
    const rel = pathFor(entry.name);
    if (event.target.checked) state.selected.add(rel); else state.selected.delete(rel);
  }
  renderEntries();
});
$("delete-selected").addEventListener("click", deleteSelected);
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
  if (event.key === "Escape") { closeSidebar(); $("logo-lightbox").hidden = true; }
});

$("logo-open").addEventListener("click", () => { $("logo-lightbox").hidden = false; });
$("logo-lightbox").addEventListener("click", () => { $("logo-lightbox").hidden = true; });

setTheme(localStorage.getItem("file-server-theme-v2") || "dark");
renderTransfers();
navigate("");
