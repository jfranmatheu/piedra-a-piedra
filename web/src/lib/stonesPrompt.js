/**
 * System / user prompts for AI .stones editing via NVIDIA NIM.
 */

export const STONES_FORMAT_SPEC = `
# Formato .stones (DEBES respetarlo exactamente)

Un archivo .stones es texto plano UTF-8. Estructura en este orden:

1) Cabecera
   # Modelo: Título del proyecto
   > Subtítulo opcional

2) Metadatos opcionales
   @meta
   start: YYYY-MM-DD
   end: YYYY-MM-DD
   (otras claves clave: valor también válidas)

3) Piedras (milestones), cada una así:

═══════════════════════════════════════════════════════════════
PIEDRA N · Título
tiempo: texto libre
periodo: texto libre
icon: emoji
color: #rrggbb
date_start: YYYY-MM-DD
date_end: YYYY-MM-DD
═══════════════════════════════════════════════════════════════

Párrafos de descripción libres.

### Tareas

- [ ] Título de tarea pendiente
  periodo: días 1–3
  xp: 100
  notas: detalle en una línea
  img: archivo.png
  date_start: YYYY-MM-DD
  date_end: YYYY-MM-DD
  assignees: @username1, @username2

- [x] Tarea ya hecha
  xp: 50

Reglas:
- Separador opcional "---" entre piedras.
- Alternativa de título: "## Piedra N · Título" (sin banner).
- Checkboxes: "- [ ]" pendiente, "- [x]" hecha.
- Campos de tarea indentados (2 espacios) bajo el checkbox.
- Sinónimos OK: tiempo/time, periodo/period, icon/icono, notas/notes, img/image.
- NO uses JSON, YAML ni HTML.
- Conserva números de PIEDRA (1, 2, 3…) salvo que el usuario pida reordenar/renumerar.
- Conserva títulos de tareas existentes si solo cambian atributos.
- No inventes asignados (@username) que no existan en el contexto.
- Las imágenes son solo nombres de archivo; no inventes binarios.
`.trim();

export function buildNimSystemPrompt(lang = "es") {
  if (lang === "en") {
    return `You are an expert roadmap editor for Piedra a Piedra.
You receive a .stones project file and a user instruction.
Return ONLY a valid full .stones file with the edits applied.
No markdown fences, no commentary.
Keep structure and PIEDRA numbers unless asked otherwise.
Be concise in descriptions/notes to save tokens.

${STONES_FORMAT_SPEC}`;
  }
  return `Eres un editor experto de roadmaps para Piedra a Piedra.
Recibes un archivo .stones y una instrucción del usuario.
Devuelve ÚNICAMENTE el .stones completo actualizado.
Sin fences markdown ni comentarios.
Conserva estructura y números PIEDRA salvo que se pida lo contrario.
Sé conciso en descripciones/notas para ahorrar tokens.

${STONES_FORMAT_SPEC}`;
}

export function buildNimUserPrompt({
  stonesText,
  userPrompt,
  mentionsContext = "",
  lang = "es",
}) {
  const parts = [];
  if (lang === "en") {
    parts.push("## Current project (.stones)\n");
    parts.push(stonesText.trim());
    parts.push("\n\n## User instruction\n");
    parts.push(userPrompt.trim());
    if (mentionsContext) {
      parts.push("\n\n## Referenced stones/tasks (@mentions)\n");
      parts.push(mentionsContext);
    }
    parts.push(
      "\n\n## Output\nReturn the FULL updated .stones file only. No prose."
    );
  } else {
    parts.push("## Proyecto actual (.stones)\n");
    parts.push(stonesText.trim());
    parts.push("\n\n## Instrucción del usuario\n");
    parts.push(userPrompt.trim());
    if (mentionsContext) {
      parts.push("\n\n## Piedras/tareas referenciadas (@menciones)\n");
      parts.push(mentionsContext);
    }
    parts.push(
      "\n\n## Salida\nDevuelve SOLO el archivo .stones completo actualizado. Sin prosa."
    );
  }
  return parts.join("");
}

/**
 * Extrae el .stones de la respuesta del modelo (quita fences y prosa).
 */
export function extractStonesFromAiResponse(text) {
  let s = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!s) throw new Error("Respuesta vacía del modelo");

  // ```stones ... ``` or ``` ... ```
  const fence = s.match(/```(?:stones|text|markdown|md)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  // Si hay prosa antes, arrancar en cabecera conocida
  const markers = [
    /^#\s*Modelo\s*:/im,
    /^@meta\s*$/im,
    /^(?:PIEDRA|Piedra|##\s*Piedra)\s*\d+/im,
    /^═{3,}/m,
  ];
  let start = -1;
  for (const re of markers) {
    const m = s.match(re);
    if (m && m.index != null) {
      if (start < 0 || m.index < start) start = m.index;
    }
  }
  if (start > 0) s = s.slice(start).trim();

  // Cortar prosa final habitual
  const endNoise = s.search(
    /\n(?:Notas?|Note|Explanation|Explicaci[oó]n|Resumen|Summary)\s*:\s*\n/i
  );
  if (endNoise > 80) s = s.slice(0, endNoise).trim();

  if (!s.includes("PIEDRA") && !s.includes("Piedra") && !/^#\s*Modelo/im.test(s)) {
    throw new Error(
      "La respuesta no parece un .stones válido (falta cabecera o piedras)"
    );
  }
  return s;
}
