"""
parser.py — Parsea un archivo .stones (texto natural) a un dict estructurado.

Formatos soportados (mezclables):

  # Modelo: Título
  > descripción / subtítulo

  @meta
  clave: valor

  @team  (o @equipo)
  - Ana · product · #EE5B1F
  - Luis | eng | #0F9BB0
  María: content, #0E9A5B

  ═══ PIEDRA N · Título ═══
  ...

  ### Tareas
  - [ ] Título de tarea
    periodo: días 1–3
    xp: 100
    asignado: Ana, Luis
    notas: texto libre
    img: archivo.png
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any


# ── helpers ──────────────────────────────────────────────────────────────────

_RE_MODEL = re.compile(r"^#\s*Modelo\s*:\s*(.+)$", re.I)
_RE_SUBTITLE = re.compile(r"^>\s*(.+)$")
_RE_META_START = re.compile(r"^@meta\s*$", re.I)
_RE_TEAM_START = re.compile(r"^@(team|equipo|members|miembros)\s*$", re.I)
_RE_KV = re.compile(r"^([a-zA-ZáéíóúñÁÉÍÓÚÑ_][\wáéíóúñÁÉÍÓÚÑ_ .'-]*)\s*:\s*(.+)$")
_RE_STONE_BANNER = re.compile(
    r"^[═\-=─━]{3,}\s*$"
)
_RE_STONE_TITLE = re.compile(
    r"^(?:PIEDRA|Piedra|##\s*Piedra)\s*(\d+)\s*[·:\-–—]\s*(.+)$",
    re.I,
)
_RE_STONE_MD = re.compile(
    r"^##\s*(?:Piedra\s*)?(\d+)\s*[·:\-–—]\s*(.+)$",
    re.I,
)
_RE_TASKS_HEADER = re.compile(r"^###?\s*Tareas\s*$", re.I)
_RE_TASK = re.compile(r"^[-*]\s*\[([ xX])\]\s*(.+)$")
_RE_SEP = re.compile(r"^[─\-═━]{3,}\s*$")
_RE_SECTION = re.compile(r"^###?\s+(.+)$")
_RE_BULLET = re.compile(r"^[-*•]\s+(.+)$")
_RE_COLOR = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b")

_TEAM_PALETTE = [
    "#EE5B1F", "#0F9BB0", "#0E9A5B", "#6B4EA8", "#D99000",
    "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f59e0b",
]

_ASSIGNEE_KEYS = {
    "asignado", "asignados", "asigna", "assignee", "assignees",
    "owner", "owners", "quien", "quién", "para", "miembro", "miembros",
    "responsable", "responsables", "team",
}


def _slug(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s\-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s)
    return s.strip("-") or "item"


def _parse_assignee_names(val: str) -> list[str]:
    """'Ana, Luis y María' / 'Ana | Luis' → lista de nombres."""
    if not val or not val.strip():
        return []
    parts = re.split(r"\s*[,;|/]\s*|\s+y\s+|\s+e\s+|\s+and\s+", val.strip(), flags=re.I)
    return [p.strip() for p in parts if p.strip()]


def _parse_team_line(raw: str) -> dict[str, str] | None:
    """Parsea una línea de miembro: nombre · rol · #color"""
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    bm = _RE_BULLET.match(line)
    if bm:
        line = bm.group(1).strip()

    color = ""
    cm = _RE_COLOR.search(line)
    if cm:
        color = cm.group(0)
        line = (line[: cm.start()] + line[cm.end() :]).strip(" ,;·|—–")

    # Name: role  OR  Name · role  OR  Name | role
    name = line
    role = ""
    km = _RE_KV.match(line)
    if km and not km.group(1).lower() in ("tiempo", "time", "periodo"):
        name = km.group(1).strip()
        rest = km.group(2).strip()
        rest = _RE_COLOR.sub("", rest).strip(" ,;")
        role = rest
    else:
        parts = re.split(r"\s*[·|—–]\s*", line)
        parts = [p.strip() for p in parts if p.strip()]
        if parts:
            name = parts[0]
            if len(parts) > 1:
                role = parts[1]

    name = name.strip()
    if not name:
        return None
    return {
        "id": _slug(name),
        "name": name,
        "role": role,
        "color": color,
    }


def _ensure_team_member(
    team: list[dict[str, Any]],
    by_id: dict[str, dict[str, Any]],
    by_name: dict[str, dict[str, Any]],
    name: str,
) -> str:
    """Asegura que el nombre exista en el equipo; devuelve id."""
    key = name.strip().lower()
    if key in by_name:
        return by_name[key]["id"]
    sid = _slug(name)
    if sid in by_id:
        return sid
    member = {
        "id": sid,
        "name": name.strip(),
        "role": "",
        "color": _TEAM_PALETTE[len(team) % len(_TEAM_PALETTE)],
    }
    team.append(member)
    by_id[sid] = member
    by_name[key] = member
    by_name[sid] = member
    return sid


def _parse_kv_block(lines: list[str], start: int) -> tuple[dict[str, str], int]:
    """Lee pares clave: valor consecutivos desde start. Devuelve (dict, next_i)."""
    data: dict[str, str] = {}
    i = start
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            break
        m = _RE_KV.match(line.strip())
        if not m:
            break
        # meta keys: normalizar a minúsculas sin espacios raros
        key = m.group(1).strip().lower().replace(" ", "_")
        data[key] = m.group(2).strip()
        i += 1
    return data, i


def _parse_team_block(lines: list[str], start: int) -> tuple[list[dict[str, Any]], int]:
    """Lee bloque @team hasta línea vacía doble o siguiente sección."""
    members: list[dict[str, Any]] = []
    i = start
    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            # una línea vacía termina el bloque si la siguiente no es miembro
            nxt = i + 1
            while nxt < len(lines) and not lines[nxt].strip():
                nxt += 1
            if nxt >= len(lines):
                i = nxt
                break
            peek = lines[nxt].strip()
            if (
                peek.startswith("@")
                or _RE_STONE_BANNER.match(peek)
                or _RE_STONE_TITLE.match(peek)
                or _RE_STONE_MD.match(peek)
                or _RE_MODEL.match(peek)
                or _RE_TASKS_HEADER.match(peek)
            ):
                i += 1
                break
            # blank dentro del team: saltar
            i += 1
            continue
        if stripped.startswith("@") or _RE_STONE_BANNER.match(stripped) or _RE_STONE_TITLE.match(
            stripped
        ) or _RE_STONE_MD.match(stripped) or _RE_MODEL.match(stripped):
            break
        member = _parse_team_line(stripped)
        if member:
            members.append(member)
        i += 1
    return members, i


def _flush_desc(buf: list[str]) -> str:
    return "\n".join(buf).strip()


# ── parser principal ─────────────────────────────────────────────────────────

def parse_stones(text: str) -> dict[str, Any]:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    model: dict[str, Any] = {
        "title": "Sin título",
        "subtitle": "",
        "meta": {},
        "team": [],
        "stones": [],
    }

    i = 0
    n = len(lines)
    in_meta = False
    current_stone: dict[str, Any] | None = None
    desc_buf: list[str] = []
    in_tasks = False
    current_task: dict[str, Any] | None = None

    def close_task():
        nonlocal current_task
        if current_task and current_stone is not None:
            current_stone["tasks"].append(current_task)
            current_task = None

    def close_stone():
        nonlocal current_stone, desc_buf, in_tasks, current_task
        close_task()
        if current_stone is not None:
            if desc_buf:
                current_stone["description"] = _flush_desc(desc_buf)
                desc_buf = []
            if not current_stone.get("id"):
                current_stone["id"] = _slug(
                    f"piedra-{current_stone.get('number', 0)}-{current_stone.get('title', '')}"
                )
            model["stones"].append(current_stone)
            current_stone = None
        in_tasks = False

    def start_stone(number: str, title: str):
        nonlocal current_stone, desc_buf, in_tasks, current_task
        close_stone()
        current_stone = {
            "number": int(number),
            "title": title.strip(),
            "id": _slug(f"piedra-{number}-{title}"),
            "time": "",
            "period": "",
            "icon": "🪨",
            "color": "",
            "description": "",
            "tasks": [],
        }
        desc_buf = []
        in_tasks = False
        current_task = None

    while i < n:
        raw = lines[i]
        line = raw.rstrip()
        stripped = line.strip()

        # vacío
        if not stripped:
            if not in_tasks and current_stone and not current_task:
                # párrafos de descripción: un blank separa, se acumula
                if desc_buf and desc_buf[-1] != "":
                    desc_buf.append("")
            i += 1
            continue

        # título del modelo
        m = _RE_MODEL.match(stripped)
        if m and current_stone is None:
            model["title"] = m.group(1).strip()
            i += 1
            continue

        # subtítulo
        m = _RE_SUBTITLE.match(stripped)
        if m and current_stone is None and not in_meta:
            model["subtitle"] = m.group(1).strip()
            i += 1
            continue

        # @meta
        if _RE_META_START.match(stripped):
            in_meta = True
            i += 1
            meta, i = _parse_kv_block(lines, i)
            model["meta"].update(meta)
            in_meta = False
            continue

        # banner ═══  → la siguiente línea no vacía puede ser el título de piedra
        if _RE_STONE_BANNER.match(stripped) or (
            _RE_SEP.match(stripped) and len(stripped) >= 10 and current_stone is None
        ):
            # mirar siguiente línea útil
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j < n:
                sm = _RE_STONE_TITLE.match(lines[j].strip()) or _RE_STONE_MD.match(
                    lines[j].strip()
                )
                if sm:
                    start_stone(sm.group(1), sm.group(2))
                    # saltar título y posible banner de cierre
                    i = j + 1
                    if i < n and (
                        _RE_STONE_BANNER.match(lines[i].strip())
                        or _RE_SEP.match(lines[i].strip())
                    ):
                        i += 1
                    # kv inmediatos de la piedra
                    kv, i = _parse_kv_block(lines, i)
                    _apply_stone_kv(current_stone, kv)
                    continue
            # separador de tareas entre piedras (--- corto)
            if current_stone and len(stripped) < 20:
                close_task()
                i += 1
                continue
            i += 1
            continue

        # ## Piedra N: título (sin banner)
        m = _RE_STONE_TITLE.match(stripped) or _RE_STONE_MD.match(stripped)
        if m:
            start_stone(m.group(1), m.group(2))
            i += 1
            kv, i = _parse_kv_block(lines, i)
            _apply_stone_kv(current_stone, kv)
            continue

        # ### Tareas
        if _RE_TASKS_HEADER.match(stripped):
            if current_stone and desc_buf:
                current_stone["description"] = _flush_desc(desc_buf)
                desc_buf = []
            close_task()
            in_tasks = True
            i += 1
            continue

        # tarea
        m = _RE_TASK.match(stripped)
        if m and current_stone is not None:
            close_task()
            in_tasks = True
            done = m.group(1).lower() == "x"
            title = m.group(2).strip()
            current_task = {
                "id": _slug(title),
                "title": title,
                "done": done,
                "period": "",
                "xp": 50,
                "notes": "",
                "img": "",
                "assignees": [],  # ids de team (se resuelven al final)
                "_assignee_raw": [],  # nombres tal cual en el archivo
            }
            i += 1
            # metadatos indentados de la tarea
            while i < n:
                tl = lines[i]
                if not tl.strip():
                    break
                # sigue indentado o es kv de tarea
                if tl.startswith((" ", "\t")) or _RE_KV.match(tl.strip()):
                    km = _RE_KV.match(tl.strip())
                    if km:
                        key = km.group(1).strip().lower().replace(" ", "_")
                        val = km.group(2).strip()
                        if key in ("periodo", "period", "tiempo", "time"):
                            current_task["period"] = val
                        elif key == "xp":
                            try:
                                current_task["xp"] = int(re.sub(r"[^\d]", "", val) or "50")
                            except ValueError:
                                current_task["xp"] = 50
                        elif key in ("notas", "notes", "nota", "desc", "descripcion", "descripción"):
                            current_task["notes"] = val
                        elif key in ("img", "image", "imagen", "foto"):
                            # solo el nombre; la UI resuelve a images/
                            current_task["img"] = Path(val).name
                        elif key in _ASSIGNEE_KEYS:
                            current_task["_assignee_raw"].extend(_parse_assignee_names(val))
                        else:
                            current_task[key] = val
                    else:
                        # línea indentada libre → notas
                        current_task["notes"] = (
                            (current_task["notes"] + " " + tl.strip()).strip()
                        )
                    i += 1
                else:
                    break
            continue

        # @team / @equipo
        if _RE_TEAM_START.match(stripped) and current_stone is None:
            i += 1
            members, i = _parse_team_block(lines, i)
            # merge por id (último gana campos no vacíos)
            existing = {m["id"]: m for m in model["team"]}
            for m in members:
                if m["id"] in existing:
                    ex = existing[m["id"]]
                    if m.get("role"):
                        ex["role"] = m["role"]
                    if m.get("color"):
                        ex["color"] = m["color"]
                    if m.get("name"):
                        ex["name"] = m["name"]
                else:
                    model["team"].append(m)
                    existing[m["id"]] = m
            continue

        # kv sueltos de piedra (si aún no hay descripción larga)
        if current_stone is not None and not in_tasks and current_task is None:
            km = _RE_KV.match(stripped)
            if km and km.group(1).lower() in (
                "tiempo", "time", "periodo", "period", "icon", "icono",
                "color", "colour", "id",
            ):
                _apply_stone_kv(current_stone, {km.group(1).lower(): km.group(2).strip()})
                i += 1
                continue

        # descripción libre de la piedra
        if current_stone is not None and not in_tasks and current_task is None:
            if _RE_SECTION.match(stripped) and not _RE_TASKS_HEADER.match(stripped):
                i += 1
                continue
            if not _RE_SEP.match(stripped):
                desc_buf.append(stripped)
            i += 1
            continue

        # fallback: ignorar
        i += 1

    close_stone()

    # ── resolver equipo + assignees ───────────────────────────────────────────
    team: list[dict[str, Any]] = model["team"]
    by_id: dict[str, dict[str, Any]] = {}
    by_name: dict[str, dict[str, Any]] = {}
    for idx, m in enumerate(team):
        if not m.get("color"):
            m["color"] = _TEAM_PALETTE[idx % len(_TEAM_PALETTE)]
        by_id[m["id"]] = m
        by_name[m["name"].lower()] = m
        by_name[m["id"]] = m

    for s in model["stones"]:
        for t in s["tasks"]:
            raw_names = t.pop("_assignee_raw", []) or []
            # también si alguien metió assignees como string suelto
            ids: list[str] = []
            for name in raw_names:
                mid = _ensure_team_member(team, by_id, by_name, name)
                if mid not in ids:
                    ids.append(mid)
            t["assignees"] = ids

    model["team"] = team

    # stats
    total_tasks = sum(len(s["tasks"]) for s in model["stones"])
    done_tasks = sum(1 for s in model["stones"] for t in s["tasks"] if t["done"])
    total_xp = sum(t["xp"] for s in model["stones"] for t in s["tasks"])
    earned_xp = sum(t["xp"] for s in model["stones"] for t in s["tasks"] if t["done"])
    model["stats"] = {
        "stones": len(model["stones"]),
        "tasks": total_tasks,
        "done": done_tasks,
        "total_xp": total_xp,
        "earned_xp": earned_xp,
        "progress": round(100 * done_tasks / total_tasks, 1) if total_tasks else 0,
        "team": len(team),
    }

    # colores por defecto si faltan
    palette = ["#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#3b82f6"]
    for idx, s in enumerate(model["stones"]):
        if not s.get("color"):
            s["color"] = palette[idx % len(palette)]

    return model


def _apply_stone_kv(stone: dict[str, Any] | None, kv: dict[str, str]) -> None:
    if not stone or not kv:
        return
    for k, v in kv.items():
        k = k.lower()
        if k in ("tiempo", "time"):
            stone["time"] = v
        elif k in ("periodo", "period"):
            stone["period"] = v
        elif k in ("icon", "icono"):
            stone["icon"] = v
        elif k in ("color", "colour"):
            stone["color"] = v
        elif k == "id":
            stone["id"] = _slug(v)
        else:
            stone[k] = v


def parse_file(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    data = parse_stones(text)
    data["source"] = p.name
    return data


if __name__ == "__main__":
    import json
    import sys

    src = sys.argv[1] if len(sys.argv) > 1 else "modelo.stones"
    result = parse_file(src)
    print(json.dumps(result, ensure_ascii=False, indent=2))
