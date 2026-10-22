"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(process.env.DATA_DIR || "/share/file_server");
const PUBLIC = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 8085);
const MAX_BODY = 1024 * 1024;
const MAX_STORAGE_BYTES = 15 * 1024 ** 3;
let reservedQuotaBytes = 0;
let quotaQueue = Promise.resolve();
let mutationQueue = Promise.resolve();

fs.mkdirSync(ROOT, { recursive: true });

async function withQuotaLock(callback) {
  const previous = quotaQueue;
  let release;
  quotaQueue = new Promise((resolve) => { release = resolve; });
  await previous;
  try { return await callback(); } finally { release(); }
}

async function withMutationLock(callback) {
  const previous = mutationQueue;
  let release;
  mutationQueue = new Promise((resolve) => { release = resolve; });
  await previous;
  try { return await callback(); } finally { release(); }
}

async function getUsageBytes(directory = ROOT) {
  let total = 0;
  for (const entry of await fs.promises.readdir(directory, { withFileTypes: true })) {
    if (/^\.upload-[a-f0-9]{16}$/.test(entry.name)) continue;
    const full = path.join(directory, entry.name);
    const stat = await fs.promises.lstat(full);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) total += await getUsageBytes(full);
    else if (stat.isFile()) total += stat.size;
  }
  return total;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const data = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": data.length,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function relativePath(raw) {
  const value = String(raw || "");
  if (value.includes("\\") || value.includes("\0") || value.startsWith("/")) {
    throw Object.assign(new Error("Calea nu este validă."), { status: 400 });
  }
  const parts = value.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw Object.assign(new Error("Calea nu este validă."), { status: 400 });
  }
  return parts.join("/");
}

function absolutePath(rel) {
  const target = path.resolve(ROOT, ...rel.split("/").filter(Boolean));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    throw Object.assign(new Error("Calea nu este validă."), { status: 400 });
  }
  return target;
}

async function checkedTarget(rel, { createParents = false, allowMissing = false } = {}) {
  let current = ROOT;
  const parts = rel ? rel.split("/") : [];
  for (let i = 0; i < parts.length; i += 1) {
    current = path.join(current, parts[i]);
    try {
      const stat = await fs.promises.lstat(current);
      if (stat.isSymbolicLink()) throw Object.assign(new Error("Legăturile simbolice nu sunt permise."), { status: 400 });
      if (i < parts.length - 1 && !stat.isDirectory()) throw Object.assign(new Error("Calea nu este un director."), { status: 400 });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (i < parts.length - 1 && createParents) {
        await fs.promises.mkdir(current);
      } else if (!allowMissing || i < parts.length - 1) {
        throw Object.assign(new Error("Fișierul sau folderul nu există."), { status: 404 });
      }
    }
  }
  return absolutePath(rel);
}

async function readJson(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > MAX_BODY) throw Object.assign(new Error("Cererea este prea mare."), { status: 413 });
  }
  try { return JSON.parse(text || "{}"); }
  catch { throw Object.assign(new Error("Date JSON invalide."), { status: 400 }); }
}

function safeName(name) {
  const value = String(name || "").trim();
  if (!value || value === "." || value === ".." || value.includes("/") || value.includes("\\") || value.includes("\0")) {
    throw Object.assign(new Error("Numele nu este valid."), { status: 400 });
  }
  return value;
}

async function listDirectory(rel) {
  const target = await checkedTarget(rel);
  const stat = await fs.promises.stat(target);
  if (!stat.isDirectory()) throw Object.assign(new Error("Calea nu este un folder."), { status: 400 });
  const entries = await fs.promises.readdir(target, { withFileTypes: true });
  const result = await Promise.all(entries.filter((entry) => !entry.isSymbolicLink() && !/^\.upload-[a-f0-9]{16}$/.test(entry.name)).map(async (entry) => {
    const full = path.join(target, entry.name);
    const itemStat = await fs.promises.stat(full);
    return {
      name: entry.name,
      type: entry.isDirectory() ? "folder" : "file",
      size: entry.isDirectory() ? null : itemStat.size,
      modified: itemStat.mtime.toISOString(),
    };
  }));
  result.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
  return result;
}

async function listFolders(directory = "", folders = []) {
  const target = await checkedTarget(directory);
  const entries = await fs.promises.readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || /^\.upload-[a-f0-9]{16}$/.test(entry.name)) continue;
    const rel = [directory, entry.name].filter(Boolean).join("/");
    folders.push({ path: rel, name: entry.name });
    await listFolders(rel, folders);
  }
  return folders;
}

function encodeDisposition(name) {
  const fallback = name.replace(/[\r\n"\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

const PREVIEW_TYPES = {
  pdf: "application/pdf",
  avif: "image/avif", bmp: "image/bmp", gif: "image/gif", ico: "image/x-icon",
  jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", svg: "image/svg+xml", webp: "image/webp",
  aac: "audio/aac", flac: "audio/flac", m4a: "audio/mp4", mp3: "audio/mpeg", oga: "audio/ogg",
  ogg: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", weba: "audio/webm",
  mp4: "video/mp4", m4v: "video/mp4", ogv: "video/ogg", webm: "video/webm",
  txt: "text/plain; charset=utf-8", log: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8", json: "application/json; charset=utf-8", xml: "text/plain; charset=utf-8",
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/plain; charset=utf-8",
  js: "text/plain; charset=utf-8", mjs: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8",
  yaml: "text/plain; charset=utf-8", yml: "text/plain; charset=utf-8", ini: "text/plain; charset=utf-8",
  conf: "text/plain; charset=utf-8", sh: "text/plain; charset=utf-8", py: "text/plain; charset=utf-8",
  c: "text/plain; charset=utf-8", h: "text/plain; charset=utf-8", cpp: "text/plain; charset=utf-8",
  java: "text/plain; charset=utf-8", sql: "text/plain; charset=utf-8",
};

function streamZip(res, cwd, entries, archiveName) {
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": encodeDisposition(archiveName),
    "X-Content-Type-Options": "nosniff",
  });
  const zip = spawn("zip", ["-r", "-", "--", ...entries], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  zip.stdout.pipe(res, { end: false });
  zip.stderr.on("data", (chunk) => console.error("zip:", chunk.toString().trim()));
  zip.on("error", (error) => { if (!res.headersSent) send(res, 500, { error: "Nu s-a putut crea arhiva ZIP." }); else res.destroy(error); });
  zip.on("close", (code) => {
    if (res.destroyed) return;
    if (code === 0) res.end();
    else res.destroy(new Error(`zip exited ${code}`));
  });
  res.on("close", () => { if (!res.writableEnded && !zip.killed) zip.kill("SIGTERM"); });
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      if (["GET", "HEAD"].includes(req.method) && url.pathname === "/api/preview") {
        const rel = relativePath(url.searchParams.get("path"));
        if (!rel) throw Object.assign(new Error("Selectează un fișier pentru previzualizare."), { status: 400 });
        const extension = path.posix.extname(rel).slice(1).toLowerCase();
        const contentType = PREVIEW_TYPES[extension];
        if (!contentType) throw Object.assign(new Error("Acest tip de fișier nu poate fi previzualizat în Chrome."), { status: 415 });
        const target = await checkedTarget(rel);
        const stat = await fs.promises.stat(target);
        if (!stat.isFile()) throw Object.assign(new Error("Doar fișierele pot fi previzualizate."), { status: 400 });
        const name = path.posix.basename(rel);
        const headers = {
          "Content-Type": contentType,
          "Content-Length": stat.size,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; ${encodeDisposition(name).slice("attachment; ".length)}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        };
        if (["svg", "html", "htm"].includes(extension)) headers["Content-Security-Policy"] = "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
        let start = 0;
        let end = stat.size - 1;
        let status = 200;
        const range = req.headers.range;
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!match || stat.size === 0 || (!match[1] && !match[2])) {
            res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
            return res.end();
          }
          if (!match[1]) {
            const suffixLength = Number(match[2]);
            if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) {
              res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
              return res.end();
            }
            start = Math.max(0, stat.size - suffixLength);
          } else {
            start = Number(match[1]);
            if (!Number.isSafeInteger(start)) start = stat.size;
          }
          if (match[2] && match[1]) end = Math.min(Number(match[2]), stat.size - 1);
          if (start >= stat.size || end < start || !Number.isSafeInteger(end)) {
            res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
            return res.end();
          }
          status = 206;
          headers["Content-Length"] = end - start + 1;
          headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
        }
        res.writeHead(status, headers);
        if (req.method === "HEAD") return res.end();
        return fs.createReadStream(target, range ? { start, end } : undefined).pipe(res);
      }

      if (req.method === "GET" && url.pathname === "/api/usage") {
        const usedBytes = await getUsageBytes();
        return send(res, 200, { usedBytes, limitBytes: MAX_STORAGE_BYTES, availableBytes: Math.max(0, MAX_STORAGE_BYTES - usedBytes), percent: Math.min(100, usedBytes / MAX_STORAGE_BYTES * 100) });
      }

      if (req.method === "GET" && url.pathname === "/api/list") {
        const dir = relativePath(url.searchParams.get("path"));
        return send(res, 200, { path: dir, entries: await listDirectory(dir) });
      }

      if (req.method === "GET" && url.pathname === "/api/folders") {
        return send(res, 200, { folders: await listFolders() });
      }

      if (req.method === "POST" && url.pathname === "/api/move") {
        const body = await readJson(req);
        const sources = [...new Set((Array.isArray(body.sources) ? body.sources : []).map(relativePath))];
        const destination = relativePath(body.destination);
        if (!sources.length || sources.some((source) => !source)) throw Object.assign(new Error("Selectează cel puțin un element de mutat."), { status: 400 });
        const movedCount = await withMutationLock(async () => {
          const destinationPath = await checkedTarget(destination);
          if (!(await fs.promises.stat(destinationPath)).isDirectory()) throw Object.assign(new Error("Destinația nu este un folder."), { status: 400 });
          const moves = [];
          const targetNames = new Set();
          for (const source of sources) {
            if (destination === source || destination.startsWith(`${source}/`)) throw Object.assign(new Error("Un folder nu poate fi mutat în interiorul lui."), { status: 400 });
            const sourcePath = await checkedTarget(source);
            const name = path.posix.basename(source);
            if (path.posix.dirname(source) === (destination || ".")) throw Object.assign(new Error(`„${name}” se află deja în folderul ales.`), { status: 400 });
            if (targetNames.has(name)) throw Object.assign(new Error(`Mai multe elemente selectate au numele „${name}”.`), { status: 409 });
            targetNames.add(name);
            const target = path.join(destinationPath, name);
            try {
              await fs.promises.lstat(target);
              throw Object.assign(new Error(`Destinația conține deja „${name}”.`), { status: 409 });
            } catch (error) { if (error.code !== "ENOENT") throw error; }
            moves.push({ sourcePath, target });
          }
          const moved = [];
          try {
            for (const move of moves) {
              await fs.promises.rename(move.sourcePath, move.target);
              moved.push(move);
            }
          } catch (error) {
            for (const move of moved.reverse()) await fs.promises.rename(move.target, move.sourcePath).catch(() => {});
            throw error;
          }
          return moves.length;
        });
        return send(res, 200, { ok: true, moved: movedCount });
      }

      if (req.method === "POST" && url.pathname === "/api/download-selected") {
        const body = await readJson(req);
        const paths = [...new Set((Array.isArray(body.paths) ? body.paths : []).map(relativePath))];
        if (!paths.length || paths.some((item) => !item)) throw Object.assign(new Error("Selectează fișiere sau foldere pentru descărcare."), { status: 400 });
        for (const item of paths) await checkedTarget(item);
        return streamZip(res, ROOT, paths, "fisiere-selectate.zip");
      }

      if (req.method === "POST" && url.pathname === "/api/folders") {
        const body = await readJson(req);
        const parent = relativePath(body.path);
        const name = safeName(body.name);
        const parentPath = await checkedTarget(parent);
        if (!(await fs.promises.stat(parentPath)).isDirectory()) throw Object.assign(new Error("Calea nu este un folder."), { status: 400 });
        const rel = [parent, name].filter(Boolean).join("/");
        await withMutationLock(() => fs.promises.mkdir(absolutePath(rel)));
        return send(res, 201, { ok: true });
      }

      if (req.method === "PUT" && url.pathname === "/api/upload") {
        const rel = relativePath(url.searchParams.get("path"));
        if (!rel) throw Object.assign(new Error("Lipsește numele fișierului."), { status: 400 });
        const overwrite = url.searchParams.get("overwrite") === "1";
        const target = await checkedTarget(rel, { createParents: true, allowMissing: true });
        let oldSize = 0;
        try {
          const existing = await fs.promises.lstat(target);
          if (existing.isSymbolicLink() || existing.isDirectory()) throw Object.assign(new Error("Există deja un folder cu acest nume."), { status: 409 });
          if (!overwrite) return send(res, 409, { error: "Există deja un fișier cu acest nume.", exists: true });
          oldSize = existing.size;
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        const contentLength = Number(req.headers["content-length"]);
        if (!Number.isSafeInteger(contentLength) || contentLength < 0) throw Object.assign(new Error("Lipsește dimensiunea încărcării."), { status: 411 });
        const growthBytes = Math.max(0, contentLength - oldSize);
        await withQuotaLock(async () => {
          const usedBytes = await getUsageBytes();
          if (usedBytes + reservedQuotaBytes + growthBytes > MAX_STORAGE_BYTES) {
            throw Object.assign(new Error("Limita de stocare de 15 GB ar fi depășită. Șterge fișiere pentru a elibera spațiu."), { status: 413 });
          }
          reservedQuotaBytes += growthBytes;
        });
        let reservationActive = true;
        const releaseReservation = async () => {
          if (!reservationActive) return;
          await withQuotaLock(async () => {
            if (!reservationActive) return;
            reservedQuotaBytes -= growthBytes;
            reservationActive = false;
          });
        };
        const temp = path.join(path.dirname(target), `.upload-${crypto.randomBytes(8).toString("hex")}`);
        try {
          await new Promise((resolve, reject) => {
          const output = fs.createWriteStream(temp, { flags: "wx", mode: 0o644 });
          let settled = false;
          const fail = async (error) => {
            if (settled) return;
            settled = true;
            output.destroy();
            await fs.promises.unlink(temp).catch(() => {});
            await releaseReservation();
            reject(error);
          };
          req.on("aborted", () => fail(Object.assign(new Error("Încărcarea a fost anulată."), { status: 400 })));
          req.on("error", fail);
          output.on("error", fail);
          output.on("finish", async () => {
            if (settled) return;
            try {
              await withMutationLock(() => withQuotaLock(async () => {
                  if (overwrite) await fs.promises.rename(temp, target);
                  else {
                    await fs.promises.link(temp, target);
                    await fs.promises.unlink(temp);
                  }
                  reservedQuotaBytes -= growthBytes;
                  reservationActive = false;
                }));
              settled = true;
              resolve();
            } catch (error) {
              if (error.code === "EEXIST") error.status = 409;
              await fail(error);
            }
          });
          req.pipe(output);
          });
        } catch (error) {
          await releaseReservation();
          throw error;
        }
        return send(res, 201, { ok: true });
      }

      if (req.method === "GET" && url.pathname === "/api/download") {
        const rel = relativePath(url.searchParams.get("path"));
        if (!rel) throw Object.assign(new Error("Selectează un fișier sau folder."), { status: 400 });
        const target = await checkedTarget(rel);
        const stat = await fs.promises.stat(target);
        const name = path.posix.basename(rel);
        if (stat.isDirectory()) {
          return streamZip(res, target, ["."], `${name}.zip`);
        }
        res.writeHead(200, {
          "Content-Type": "application/octet-stream",
          "Content-Length": stat.size,
          "Content-Disposition": encodeDisposition(name),
          "X-Content-Type-Options": "nosniff",
        });
        return fs.createReadStream(target).pipe(res);
      }

      if (req.method === "DELETE" && url.pathname === "/api/delete") {
        const rel = relativePath(url.searchParams.get("path"));
        if (!rel) throw Object.assign(new Error("Folderul rădăcină nu poate fi șters."), { status: 400 });
        const target = await checkedTarget(rel);
        await withMutationLock(() => fs.promises.rm(target, { recursive: true, force: false }));
        return send(res, 200, { ok: true });
      }

      return send(res, 404, { error: "Endpoint-ul nu există." });
    }

    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Metodă nepermisă.", "text/plain; charset=utf-8");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const relative = pathname.replace(/^\/+/, "");
    const file = relative === "logo.png" ? path.join(__dirname, "logo.png") : path.resolve(PUBLIC, `.${pathname}`);
    if (relative !== "logo.png" && !file.startsWith(PUBLIC + path.sep)) return send(res, 404, "Nu a fost găsit.", "text/plain; charset=utf-8");
    const stat = await fs.promises.stat(file).catch(() => null);
    if (!stat || !stat.isFile()) return send(res, 404, "Nu a fost găsit.", "text/plain; charset=utf-8");
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Content-Length": stat.size, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" });
    if (req.method === "HEAD") return res.end();
    return fs.createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) return send(res, error.status || 500, { error: error.message || "Eroare internă." });
    res.destroy(error);
  }
}

const server = http.createServer(handle);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`File Server ascultă pe portul ${PORT}; fișierele sunt în ${ROOT}`);
});

module.exports = server;
