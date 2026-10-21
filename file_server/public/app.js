"use strict";

const $ = (id) => document.getElementById(id);
const state = { path: "", entries: [], toastTimer: null };
const root = document.documentElement;

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("file-server-theme", theme);
  $("theme-label").textContent = theme === "dark" ? "Temă închisă" : "Temă deschisă";
  $("theme-icon").textContent = theme === "dark" ? "☾" : "☼";
}

function toast(message, error = false) {
  const node = $("toast");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => node.classList.remove("show"), 3200);
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
  add("Acasă", "", parts.length === 0);
  let path = "";
  parts.forEach((part, index) => {
    path = [path, part].filter(Boolean).join("/");
    add(part, path, index === parts.length - 1);
  });
}

function makeAction(symbol, label, callback, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `row-action ${extraClass}`;
  button.textContent = symbol;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", callback);
  return button;
}

function renderEntries() {
  const list = $("file-list");
  list.replaceChildren();
  for (const entry of state.entries) {
    const rel = [state.path, entry.name].filter(Boolean).join("/");
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const name = document.createElement("div");
    name.className = "item-name";
    const icon = document.createElement("span");
    icon.className = `file-icon ${entry.type === "folder" ? "folder" : ""}`;
    icon.textContent = entry.type === "folder" ? "▰" : "▤";
    icon.setAttribute("aria-hidden", "true");
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = entry.name;
    open.title = entry.name;
    open.addEventListener("click", () => entry.type === "folder" ? navigate(rel) : download(rel));
    name.append(icon, open);
    nameCell.append(name);
    const size = document.createElement("td");
    size.textContent = entry.type === "folder" ? "Folder" : formatSize(entry.size);
    const modified = document.createElement("td");
    modified.textContent = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.modified));
    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(makeAction("↓", "Descarcă", () => download(rel)));
    actions.append(makeAction("×", "Șterge", () => remove(rel, entry), "delete"));
    actionCell.append(actions);
    row.append(nameCell, size, modified, actionCell);
    list.append(row);
  }
  $("empty-state").hidden = state.entries.length > 0;
  $("item-count").textContent = `${state.entries.length} ${state.entries.length === 1 ? "element" : "elemente"}`;
}

async function navigate(path = state.path) {
  $("loading-state").hidden = false;
  $("empty-state").hidden = true;
  $("file-list").replaceChildren();
  try {
    const result = await api(`/api/list?path=${encodeURIComponent(path)}`);
    state.path = result.path;
    state.entries = result.entries;
    renderBreadcrumbs();
    renderEntries();
  } catch (error) {
    toast(error.message, true);
  } finally {
    $("loading-state").hidden = true;
  }
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
    toast("Elementul a fost șters.");
    await navigate();
  } catch (error) { toast(error.message, true); }
}

function download(rel) {
  const link = document.createElement("a");
  link.href = `/api/download?path=${encodeURIComponent(rel)}`;
  link.download = "";
  document.body.append(link);
  link.click();
  link.remove();
}

async function uploadOne(file, rel, overwrite = false) {
  const response = await fetch(`/api/upload?path=${encodeURIComponent(rel)}${overwrite ? "&overwrite=1" : ""}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409 && result.exists && confirm(`„${file.name}” există deja. Îl înlocuiești?`)) {
    return uploadOne(file, rel, true);
  }
  if (response.status === 409 && result.exists) return false;
  if (!response.ok) throw new Error(result.error || `Eroare la încărcarea fișierului: ${file.name}`);
  return true;
}

async function uploadFiles(fileList, folderSelection = false) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  let done = 0;
  $("upload-status").textContent = `Se încarcă 0 din ${files.length}…`;
  for (const file of files) {
    const relativeName = folderSelection ? file.webkitRelativePath : file.name;
    const rel = [state.path, relativeName].filter(Boolean).join("/");
    try {
      if (await uploadOne(file, rel)) done += 1;
      $("upload-status").textContent = `Se încarcă ${done} din ${files.length}…`;
    } catch (error) {
      toast(error.message, true);
      if (error.message.includes("folder")) break;
    }
  }
  $("upload-status").textContent = "";
  if (done) toast(`${done} ${done === 1 ? "fișier încărcat" : "fișiere încărcate"}.`);
  await navigate();
}

$("theme-toggle").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
$("refresh").addEventListener("click", () => navigate());
$("new-folder").addEventListener("click", createFolder);
$("upload-files").addEventListener("click", () => $("file-input").click());
$("upload-folder").addEventListener("click", () => $("folder-input").click());
$("file-input").addEventListener("change", (event) => { uploadFiles(event.target.files); event.target.value = ""; });
$("folder-input").addEventListener("change", (event) => { uploadFiles(event.target.files, true); event.target.value = ""; });
setTheme(localStorage.getItem("file-server-theme") || "light");
navigate("");
