import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import DocsShell, {
  DocsCode,
  DocsKbd,
  DocsPageHeader,
  DocsSection,
} from "../components/docs/DocsShell";
import { useI18n } from "../i18n";
import { NIM_MODELS } from "../lib/nimModels";
import { NIM_API_KEYS_URL, NIM_SIGNIN_URL } from "../lib/nimSettings";

export default function DocsAiPage() {
  const { t } = useI18n();
  const d = (key) => t(`docs.ai.${key}`);

  const toc = [
    { id: "what", label: d("tocWhat") },
    { id: "setup", label: d("tocSetup") },
    { id: "models", label: d("tocModels") },
    { id: "edit", label: d("tocEdit") },
    { id: "mentions", label: d("tocMentions") },
    { id: "review", label: d("tocReview") },
    { id: "safety", label: d("tocSafety") },
  ];

  return (
    <DocsShell toc={toc}>
      <DocsPageHeader
        eyebrow={d("eyebrow")}
        title={d("title")}
        lead={d("lead")}
      />

      <div className="space-y-12">
        <DocsSection id="what" title={d("whatTitle")}>
          <p>{d("whatP1")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("whatLi1")}</li>
            <li>{d("whatLi2")}</li>
            <li>{d("whatLi3")}</li>
            <li>{d("whatLi4")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="setup" title={d("setupTitle")}>
          <p>{d("setupP")}</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>{d("setup1")}</li>
            <li>
              {d("setup2")}{" "}
              <a
                href={NIM_SIGNIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                build.nvidia.com <ExternalLink size={12} />
              </a>
            </li>
            <li>
              {d("setup3")}{" "}
              <a
                href={NIM_API_KEYS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                API keys <ExternalLink size={12} />
              </a>
            </li>
            <li>{d("setup4")}</li>
          </ol>
          <p className="text-xs text-mute">{d("setupNote")}</p>
        </DocsSection>

        <DocsSection id="models" title={d("modelsTitle")}>
          <p>{d("modelsP")}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="border-b border-border bg-elev/80 text-mute">
                <tr>
                  <th className="px-3 py-2 font-medium">{d("modelsColName")}</th>
                  <th className="px-3 py-2 font-mono font-medium">
                    {d("modelsColId")}
                  </th>
                  <th className="px-3 py-2 font-medium">{d("modelsColTier")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {NIM_MODELS.map((m) => (
                  <tr key={m.id} className="bg-black/20">
                    <td className="px-3 py-2 text-text">
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-mute">{m.blurb}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-accent">
                      {m.id}
                    </td>
                    <td className="px-3 py-2 text-dim">{m.tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-mute">{d("modelsTip")}</p>
        </DocsSection>

        <DocsSection id="edit" title={d("editTitle")}>
          <p>{d("editP")}</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>{d("edit1")}</li>
            <li>{d("edit2")}</li>
            <li>{d("edit3")}</li>
            <li>{d("edit4")}</li>
          </ol>
          <p>
            {d("editStones")}{" "}
            <Link to="/docs/stones" className="text-accent hover:underline">
              {t("docs.stones.navTitle")}
            </Link>
            .
          </p>
        </DocsSection>

        <DocsSection id="mentions" title={d("mentionsTitle")}>
          <p>{d("mentionsP")}</p>
          <DocsCode>{`Añade 2 tareas a @piedra1 sobre validación.
Sube el xp de @piedra1#Definir propuesta de valor a 150.
Reescribe la descripción de @piedra2.`}</DocsCode>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <DocsKbd>@piedraN</DocsKbd> — {d("mentionsStone")}
            </li>
            <li>
              <DocsKbd>@piedraN#título</DocsKbd> — {d("mentionsTask")}
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="review" title={d("reviewTitle")}>
          <p>{d("reviewP")}</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong className="text-text">{d("reviewNew")}</strong> —{" "}
              {d("reviewNewD")}
            </li>
            <li>
              <strong className="text-text">{d("reviewChanged")}</strong> —{" "}
              {d("reviewChangedD")}
            </li>
            <li>
              <strong className="text-text">{d("reviewRemoved")}</strong> —{" "}
              {d("reviewRemovedD")}
            </li>
          </ul>
          <p>{d("reviewApply")}</p>
        </DocsSection>

        <DocsSection id="safety" title={d("safetyTitle")}>
          <ul className="list-inside list-disc space-y-2">
            <li>{d("safety1")}</li>
            <li>{d("safety2")}</li>
            <li>{d("safety3")}</li>
            <li>{d("safety4")}</li>
          </ul>
        </DocsSection>

        <footer className="border-t border-border pt-8 text-center text-xs text-mute">
          <Link to="/docs" className="text-dim hover:text-text">
            ← {t("docs.nav.allDocs")}
          </Link>
          {" · "}
          <Link to="/docs/stones" className="text-dim hover:text-text">
            {t("docs.stones.navTitle")}
          </Link>
        </footer>
      </div>
    </DocsShell>
  );
}
