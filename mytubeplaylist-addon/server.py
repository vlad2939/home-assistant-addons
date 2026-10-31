#!/usr/bin/env python3
import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

DATA_FILE = Path("/data/data.json")
MAX_BODY = 20 * 1024 * 1024

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/data":
            self.send_json(404, {"error": "Not found"})
            return
        try:
            content = DATA_FILE.read_text(encoding="utf-8")
            json.loads(content)
        except (OSError, json.JSONDecodeError) as exc:
            self.send_json(500, {"error": f"Could not read stored JSON: {exc}"})
            return
        body = content.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        if self.path != "/data":
            self.send_json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                self.send_json(413, {"error": "Request body is empty or exceeds 20 MB"})
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict) or not isinstance(payload.get("playlists"), list):
                self.send_json(400, {"error": 'JSON must contain a "playlists" array'})
                return
            DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
            fd, temp_path = tempfile.mkstemp(prefix="data-", suffix=".json", dir=DATA_FILE.parent)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as temp_file:
                    json.dump(payload, temp_file, ensure_ascii=False, indent=2)
                    temp_file.write("\n")
                    temp_file.flush()
                    os.fsync(temp_file.fileno())
                os.replace(temp_path, DATA_FILE)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            self.send_json(200, {"ok": True})
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            self.send_json(400, {"error": f"Invalid JSON: {exc}"})
        except OSError as exc:
            self.send_json(500, {"error": f"Could not save data.json: {exc}"})

    def log_message(self, fmt, *args):
        print("[data-api] " + fmt % args, flush=True)

HTTPServer(("127.0.0.1", 3001), Handler).serve_forever()