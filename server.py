#!/usr/bin/env python3
"""
server.py — API + static para Piedra a Piedra (React dist o public legacy).

  python server.py
  python server.py --port 8765 --model modelo.stones

Dev (Vite en :5173): el proxy apunta aquí.
"""

from __future__ import annotations

import argparse
import cgi
import json
import mimetypes
import re
import sys
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
PUBLIC = ROOT / "public"
IMAGES = ROOT / "images"
DATA = ROOT / "data"
DEFAULT_MODEL = ROOT / "modelo.stones"
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"}

DATA.mkdir(exist_ok=True)
IMAGES.mkdir(exist_ok=True)

sys.path.insert(0, str(ROOT))
from parser import parse_file  # noqa: E402


def static_root() -> Path:
    if (DIST / "index.html").is_file():
        return DIST
    return PUBLIC


class Handler(SimpleHTTPRequestHandler):
    model_path: Path = DEFAULT_MODEL

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(static_root()), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(f"[piedra] {self.address_string()} {fmt % args}\n")

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path: Path, content_type: str | None = None) -> None:
        if not path.is_file():
            self.send_error(404, f"Not found: {path.name}")
            return
        data = path.read_bytes()
        ctype = content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if path.suffix.lower() in IMG_EXT:
            self.send_header("Cache-Control", "public, max-age=60")
            self._cors()
        else:
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = unquote(self.path.split("?", 1)[0])
        root = static_root()

        if path in ("/", "/index.html"):
            return self._file(root / "index.html", "text/html; charset=utf-8")

        if path == "/api/health":
            return self._json(200, {"ok": True, "model": self.model_path.name, "static": root.name})

        if path == "/api/model":
            try:
                model = parse_file(self.model_path)
                progress_path = DATA / "progress.json"
                if progress_path.is_file():
                    try:
                        model["progress"] = json.loads(progress_path.read_text(encoding="utf-8"))
                    except json.JSONDecodeError:
                        model["progress"] = {}
                else:
                    model["progress"] = {}
                return self._json(200, model)
            except Exception as e:
                return self._json(500, {"error": str(e)})

        if path == "/api/progress":
            progress_path = DATA / "progress.json"
            if progress_path.is_file():
                try:
                    return self._json(200, json.loads(progress_path.read_text(encoding="utf-8")))
                except json.JSONDecodeError:
                    return self._json(200, {})
            return self._json(200, {})

        if path == "/api/images":
            files = sorted(
                [
                    p.name
                    for p in IMAGES.iterdir()
                    if p.is_file() and p.suffix.lower() in IMG_EXT and not p.name.startswith(".")
                ],
                key=str.lower,
            )
            return self._json(200, {"images": files})

        if path.startswith("/images/"):
            name = Path(path[len("/images/") :]).name
            return self._file(IMAGES / name)

        if path in ("/modelo.stones", f"/{self.model_path.name}"):
            return self._file(self.model_path, "text/plain; charset=utf-8")

        # SPA fallback for client routes
        if not path.startswith("/api/") and not path.startswith("/images/"):
            candidate = root / path.lstrip("/")
            if candidate.is_file():
                return self._file(candidate)
            # assets under /assets
            if path.startswith("/assets/"):
                return self._file(root / path.lstrip("/"))
            if (root / "index.html").is_file() and "." not in Path(path).name:
                return self._file(root / "index.html", "text/html; charset=utf-8")

        return super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        path = unquote(self.path.split("?", 1)[0])

        if path == "/api/progress":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                return self._json(400, {"error": "JSON inválido"})

            progress_path = DATA / "progress.json"
            existing: dict = {}
            if progress_path.is_file():
                try:
                    existing = json.loads(progress_path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    existing = {}
            if isinstance(payload, dict):
                existing.update(payload)
            progress_path.write_text(
                json.dumps(existing, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            return self._json(200, {"ok": True, "progress": existing})

        if path == "/api/images":
            return self._upload_image()

        return self.send_error(404)

    def _upload_image(self) -> None:
        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            return self._json(400, {"error": "Se espera multipart/form-data"})

        length = int(self.headers.get("Content-Length", 0))
        # cgi.FieldStorage needs a file-like with the body
        environ = {
            "REQUEST_METHOD": "POST",
            "CONTENT_TYPE": ctype,
            "CONTENT_LENGTH": str(length),
        }
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ=environ,
            keep_blank_values=True,
        )
        if "file" not in form:
            return self._json(400, {"error": "Campo 'file' requerido"})

        item = form["file"]
        if not getattr(item, "file", None):
            return self._json(400, {"error": "Archivo inválido"})

        original = Path(getattr(item, "filename", None) or "upload.bin").name
        ext = Path(original).suffix.lower()
        if ext not in IMG_EXT:
            return self._json(400, {"error": f"Extensión no permitida: {ext}"})

        # sanitize basename
        stem = re.sub(r"[^\w\-]+", "-", Path(original).stem, flags=re.UNICODE).strip("-") or "img"
        name = f"{stem}{ext}"
        dest = IMAGES / name
        if dest.exists():
            name = f"{stem}-{uuid.uuid4().hex[:8]}{ext}"
            dest = IMAGES / name

        data = item.file.read()
        dest.write_bytes(data)
        return self._json(200, {"ok": True, "name": name, "url": f"/images/{name}"})


def main() -> None:
    ap = argparse.ArgumentParser(description="Piedra a Piedra server")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--model", default=str(DEFAULT_MODEL))
    ap.add_argument("--public", action="store_true")
    args = ap.parse_args()

    model_path = Path(args.model).resolve()
    if not model_path.is_file():
        print(f"[error] No se encuentra el modelo: {model_path}", file=sys.stderr)
        sys.exit(1)

    Handler.model_path = model_path
    host = "0.0.0.0" if args.public else args.host
    root = static_root()

    try:
        m = parse_file(model_path)
        print(
            f"[piedra] Modelo «{m['title']}» — {m['stats']['stones']} piedras, "
            f"{m['stats']['tasks']} tareas · static={root.name}"
        )
    except Exception as e:
        print(f"[warn] Parse falló: {e}", file=sys.stderr)

    httpd = ThreadingHTTPServer((host, args.port), Handler)
    print(f"[piedra] http://{host}:{args.port}")
    print(f"[piedra] Modelo: {model_path}")
    print(f"[piedra] Imágenes: {IMAGES}")
    print(f"[piedra] cloudflared tunnel --url http://127.0.0.1:{args.port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[piedra] Apagado.")
        httpd.server_close()


if __name__ == "__main__":
    main()
