import { Download, FileUp } from "lucide-react";
import { Link } from "react-router-dom";
import DocsShell, {
  DocsCode,
  DocsKbd,
  DocsPageHeader,
  DocsSection,
} from "../components/docs/DocsShell";
import { useI18n } from "../i18n";

const EXAMPLE_MINI = `# Modelo: Lanzamiento de producto
> Del concepto al mercado, piedra a piedra.

@meta
start: 2026-08-01
end: 2026-11-30
author: equipo

═══════════════════════════════════════════════════════════════
PIEDRA 1 · Fundación
tiempo: 2–4 semanas
periodo: semana 1–4
icon: 🪨
color: #f59e0b
═══════════════════════════════════════════════════════════════

Cimenta la idea: a quién sirves y por qué existes.

### Tareas

- [ ] Definir propuesta de valor
  periodo: días 1–3
  xp: 100
  notas: Una frase clara: qué, a quién y qué problema resuelves.
  date_start: 2026-08-01
  date_end: 2026-08-03

- [x] Nombre provisional
  xp: 50
  notas: Puede cambiar después.

---

═══════════════════════════════════════════════════════════════
PIEDRA 2 · Validación
icon: 🔍
color: #06b6d4
═══════════════════════════════════════════════════════════════

Valida que alguien lo quiere (y pagaría por ello).

### Tareas

- [ ] Entrevistas a 10 clientes
  xp: 150
  img: entrevistas.png
`;

export default function DocsStonesPage() {
  const { t, lang } = useI18n();
  const d = (key) => t(`docs.stones.${key}`);

  const toc = [
    { id: "intro", label: d("tocIntro") },
    { id: "anatomy", label: d("tocAnatomy") },
    { id: "header", label: d("tocHeader") },
    { id: "meta", label: d("tocMeta") },
    { id: "stone", label: d("tocStone") },
    { id: "tasks", label: d("tocTasks") },
    { id: "cheatsheet", label: d("tocCheat") },
    { id: "example", label: d("tocExample") },
    { id: "import-export", label: d("tocImportExport") },
    { id: "limits", label: d("tocLimits") },
    { id: "tips", label: d("tocTips") },
  ];

  return (
    <DocsShell toc={toc}>
      <DocsPageHeader eyebrow=".stones" title={d("title")} lead={d("lead")} />

      <div className="space-y-12">
        <DocsSection id="intro" title={d("introTitle")}>
          <p>{d("introP1")}</p>
          <p>{d("introP2")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("introLi1")}</li>
            <li>{d("introLi2")}</li>
            <li>{d("introLi3")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="anatomy" title={d("anatomyTitle")}>
          <p>{d("anatomyP")}</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>
              <strong className="text-text">{d("anatomy1")}</strong> — {d("anatomy1d")}
            </li>
            <li>
              <strong className="text-text">{d("anatomy2")}</strong> — {d("anatomy2d")}
            </li>
            <li>
              <strong className="text-text">{d("anatomy3")}</strong> — {d("anatomy3d")}
            </li>
            <li>
              <strong className="text-text">{d("anatomy4")}</strong> — {d("anatomy4d")}
            </li>
          </ol>
        </DocsSection>

        <DocsSection id="header" title={d("headerTitle")}>
          <p>{d("headerP")}</p>
          <DocsCode>{`# Modelo: Nombre del proyecto
> Subtítulo o descripción corta (opcional)`}</DocsCode>
          <p>
            {d("headerNote")} <DocsKbd># Modelo:</DocsKbd>{" "}
            {lang === "es" ? "y" : "and"} <DocsKbd>&gt;</DocsKbd>.
          </p>
        </DocsSection>

        <DocsSection id="meta" title={d("metaTitle")}>
          <p>{d("metaP")}</p>
          <DocsCode>{`@meta
start: 2026-08-01
end: 2026-11-30
author: equipo
theme: ember`}</DocsCode>
          <p>{d("metaKeys")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <DocsKbd>start</DocsKbd> / <DocsKbd>inicio</DocsKbd> — {d("metaStart")}
            </li>
            <li>
              <DocsKbd>end</DocsKbd> / <DocsKbd>fin</DocsKbd> — {d("metaEnd")}
            </li>
            <li>{d("metaOther")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="stone" title={d("stoneTitle")}>
          <p>{d("stoneP")}</p>
          <DocsCode>{`═══════════════════════════════════════════════════════════════
PIEDRA 1 · Fundación
tiempo: 2–4 semanas
periodo: semana 1–4
icon: 🪨
color: #f59e0b
date_start: 2026-08-01
date_end: 2026-08-28
═══════════════════════════════════════════════════════════════

Párrafos libres de descripción.
Pueden ocupar varias líneas.

### Tareas
…`}</DocsCode>
          <p>{d("stoneAlt")}</p>
          <DocsCode>{`## Piedra 2 · Validación
icon: 🔍
color: #06b6d4`}</DocsCode>
          <p className="font-medium text-text">{d("stoneFields")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <DocsKbd>tiempo</DocsKbd> / <DocsKbd>time</DocsKbd> — {d("fTime")}
            </li>
            <li>
              <DocsKbd>periodo</DocsKbd> / <DocsKbd>period</DocsKbd> — {d("fPeriod")}
            </li>
            <li>
              <DocsKbd>icon</DocsKbd> / <DocsKbd>icono</DocsKbd> — {d("fIcon")}
            </li>
            <li>
              <DocsKbd>color</DocsKbd> — {d("fColor")}
            </li>
            <li>
              <DocsKbd>date_start</DocsKbd>, <DocsKbd>date_end</DocsKbd> — {d("fDates")}
            </li>
            <li>
              <DocsKbd>id</DocsKbd> — {d("fId")}
            </li>
          </ul>
          <p>{d("stoneSep")}</p>
        </DocsSection>

        <DocsSection id="tasks" title={d("tasksTitle")}>
          <p>{d("tasksP")}</p>
          <DocsCode>{`### Tareas

- [ ] Tarea pendiente
  periodo: días 1–3
  xp: 100
  notas: Detalle opcional en una línea.
  img: captura.png
  date_start: 2026-08-01
  date_end: 2026-08-03
  assignees: @maria, @juan

- [x] Tarea ya hecha
  xp: 50`}</DocsCode>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <DocsKbd>- [ ]</DocsKbd> {d("tPending")} · <DocsKbd>- [x]</DocsKbd>{" "}
              {d("tDone")}
            </li>
            <li>
              <DocsKbd>xp</DocsKbd> — {d("tXp")}
            </li>
            <li>
              <DocsKbd>notas</DocsKbd> / <DocsKbd>notes</DocsKbd> — {d("tNotes")}
            </li>
            <li>
              <DocsKbd>img</DocsKbd> — {d("tImg")}
            </li>
            <li>
              <DocsKbd>periodo</DocsKbd>, <DocsKbd>date_start</DocsKbd>,{" "}
              <DocsKbd>date_end</DocsKbd> — {d("tDates")}
            </li>
            <li>
              <DocsKbd>assignees</DocsKbd> — {d("tAssignees")}
            </li>
          </ul>
          <p>{d("tasksIndent")}</p>
        </DocsSection>

        <DocsSection id="cheatsheet" title={d("cheatTitle")}>
          <p>{d("cheatP")}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="border-b border-border bg-elev/80 text-mute">
                <tr>
                  <th className="px-3 py-2 font-mono font-medium">{d("cheatColToken")}</th>
                  <th className="px-3 py-2 font-medium">{d("cheatColMeaning")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  ["# Modelo:", d("cheatModel")],
                  ["> …", d("cheatSub")],
                  ["@meta", d("cheatMeta")],
                  ["PIEDRA N · título", d("cheatStone")],
                  ["### Tareas", d("cheatTasks")],
                  ["- [ ] / - [x]", d("cheatCheck")],
                  ["clave: valor", d("cheatKv")],
                  ["--- / ═══", d("cheatSep")],
                ].map(([token, meaning]) => (
                  <tr key={token} className="bg-black/20">
                    <td className="px-3 py-2 font-mono text-accent">{token}</td>
                    <td className="px-3 py-2 text-dim">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocsSection>

        <DocsSection id="example" title={d("exampleTitle")}>
          <p>{d("exampleP")}</p>
          <DocsCode>{EXAMPLE_MINI}</DocsCode>
        </DocsSection>

        <DocsSection id="import-export" title={d("ieTitle")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-elev p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-text">
                <FileUp size={16} className="text-accent" />
                {d("ieImport")}
              </div>
              <p className="text-xs leading-relaxed">{d("ieImportD")}</p>
            </div>
            <div className="rounded-2xl border border-border bg-elev p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-text">
                <Download size={16} className="text-accent" />
                {d("ieExport")}
              </div>
              <p className="text-xs leading-relaxed">{d("ieExportD")}</p>
            </div>
          </div>
          <p className="mt-3">{d("ieNote")}</p>
        </DocsSection>

        <DocsSection id="limits" title={d("limitsTitle")}>
          <ul className="list-inside list-disc space-y-2">
            <li>{d("limit1")}</li>
            <li>{d("limit2")}</li>
            <li>{d("limit3")}</li>
            <li>{d("limit4")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="tips" title={d("tipsTitle")}>
          <ul className="list-inside list-disc space-y-2">
            <li>{d("tip1")}</li>
            <li>{d("tip2")}</li>
            <li>{d("tip3")}</li>
            <li>{d("tip4")}</li>
            <li>{d("tip5")}</li>
          </ul>
        </DocsSection>

        <footer className="border-t border-border pt-8 text-center text-xs text-mute">
          <Link to="/docs" className="text-dim hover:text-text">
            ← {t("docs.nav.allDocs")}
          </Link>
          {" · "}
          <Link to="/docs/start" className="text-dim hover:text-text">
            {t("docs.start.navTitle")}
          </Link>
        </footer>
      </div>
    </DocsShell>
  );
}
