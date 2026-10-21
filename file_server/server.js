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

fs.mkdirSync(ROOT, { recursive: true });

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

function encodeDisposition(name) {
  const fallback = name.replace(/[\r\n"\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "GET" && url.pathname === "/api/list") {
        const dir = relativePath(url.searchParams.get("path"));
        return send(res, 200, { path: dir, entries: await listDirectory(dir) });
      }

      if (req.method === "POST" && url.pathname === "/api/folders") {
        const body = await readJson(req);
        const parent = relativePath(body.path);
        const name = safeName(body.name);
        const parentPath = await checkedTarget(parent);
        if (!(await fs.promises.stat(parentPath)).isDirectory()) throw Object.assign(new Error("Calea nu este un folder."), { status: 400 });
        const rel = [parent, name].filter(Boolean).join("/");
        await fs.promises.mkdir(absolutePath(rel));
        return send(res, 201, { ok: true });
      }

      if (req.method === "PUT" && url.pathname === "/api/upload") {
        const rel = relativePath(url.searchParams.get("path"));
        if (!rel) throw Object.assign(new Error("Lipsește numele fișierului."), { status: 400 });
        const overwrite = url.searchParams.get("overwrite") === "1";
        const target = await checkedTarget(rel, { createParents: true, allowMissing: true });
        try {
          const existing = await fs.promises.lstat(target);
          if (existing.isSymbolicLink() || existing.isDirectory()) throw Object.assign(new Error("Există deja un folder cu acest nume."), { status: 409 });
          if (!overwrite) return send(res, 409, { error: "Există deja un fișier cu acest nume.", exists: true });
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        const temp = path.join(path.dirname(target), `.upload-${crypto.randomBytes(8).toString("hex")}`);
        await new Promise((resolve, reject) => {
          const output = fs.createWriteStream(temp, { flags: "wx", mode: 0o644 });
          let settled = false;
          const fail = async (error) => {
            if (settled) return;
            settled = true;
            output.destroy();
            await fs.promises.unlink(temp).catch(() => {});
            reject(error);
          };
          req.on("aborted", () => fail(Object.assign(new Error("Încărcarea a fost anulată."), { status: 400 })));
          req.on("error", fail);
          output.on("error", fail);
          output.on("finish", async () => {
            if (settled) return;
            try {
              if (overwrite) await fs.promises.rename(temp, target);
              else {
                await fs.promises.link(temp, target);
                await fs.promises.unlink(temp);
              }
              settled = true;
              resolve();
            } catch (error) {
              if (error.code === "EEXIST") error.status = 409;
              await fail(error);
            }
          });
          req.pipe(output);
        });
        return send(res, 201, { ok: true });
      }

      if (req.method === "GET" && url.pathname === "/api/download") {
        const rel = relativePath(url.searchParams.get("path"));
        if (!rel) throw Object.assign(new Error("Selectează un fișier sau folder."), { status: 400 });
        const target = await checkedTarget(rel);
        const stat = await fs.promises.stat(target);
        const name = path.posix.basename(rel);
        if (stat.isDirectory()) {
          res.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Disposition": encodeDisposition(`${name}.zip`),
            "X-Content-Type-Options": "nosniff",
          });
          const zip = spawn("zip", ["-r", "-", "."], { cwd: target, stdio: ["ignore", "pipe", "pipe"] });
          zip.stdout.pipe(res);
          zip.stderr.on("data", (chunk) => console.error("zip:", chunk.toString().trim()));
          zip.on("error", (error) => { if (!res.headersSent) send(res, 500, { error: "Nu s-a putut crea arhiva ZIP." }); else res.destroy(error); });
          zip.on("close", (code) => { if (code !== 0 && !res.destroyed) res.destroy(new Error(`zip exited ${code}`)); });
          return;
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
        await fs.promises.rm(target, { recursive: true, force: false });
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
