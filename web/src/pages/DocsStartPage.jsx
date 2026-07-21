import { Link } from "react-router-dom";
import DocsShell, {
  DocsKbd,
  DocsPageHeader,
  DocsSection,
} from "../components/docs/DocsShell";
import { useI18n } from "../i18n";

export default function DocsStartPage() {
  const { t } = useI18n();
  const d = (key) => t(`docs.start.${key}`);

  const toc = [
    { id: "what", label: d("tocWhat") },
    { id: "access", label: d("tocAccess") },
    { id: "first", label: d("tocFirst") },
    { id: "flow", label: d("tocFlow") },
    { id: "next", label: d("tocNext") },
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
            <li>
              <strong className="text-text">{d("whatLi1t")}</strong> — {d("whatLi1")}
            </li>
            <li>
              <strong className="text-text">{d("whatLi2t")}</strong> — {d("whatLi2")}
            </li>
            <li>
              <strong className="text-text">{d("whatLi3t")}</strong> — {d("whatLi3")}
            </li>
            <li>
              <strong className="text-text">{d("whatLi4t")}</strong> — {d("whatLi4")}
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="access" title={d("accessTitle")}>
          <p>{d("accessP1")}</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>{d("access1")}</li>
            <li>{d("access2")}</li>
            <li>{d("access3")}</li>
            <li>{d("access4")}</li>
          </ol>
          <p>{d("accessNote")}</p>
        </DocsSection>

        <DocsSection id="first" title={d("firstTitle")}>
          <p>{d("firstP")}</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>
              {d("first1")}{" "}
              <Link to="/projects" className="text-accent hover:underline">
                {t("common.projects")}
              </Link>
            </li>
            <li>{d("first2")}</li>
            <li>
              {d("first3")}{" "}
              <Link to="/docs/stones" className="text-accent hover:underline">
                .stones
              </Link>
            </li>
            <li>{d("first4")}</li>
          </ol>
        </DocsSection>

        <DocsSection id="flow" title={d("flowTitle")}>
          <p>{d("flowP")}</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <DocsKbd>{d("flowKanban")}</DocsKbd> — {d("flowKanbanD")}
            </li>
            <li>
              <DocsKbd>{d("flowTimeline")}</DocsKbd> — {d("flowTimelineD")}
            </li>
            <li>
              <DocsKbd>{d("flowPanel")}</DocsKbd> — {d("flowPanelD")}
            </li>
          </ul>
          <p>{d("flowXp")}</p>
        </DocsSection>

        <DocsSection id="next" title={d("nextTitle")}>
          <p>{d("nextP")}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/docs/stones"
              className="rounded-xl border border-border bg-elev px-4 py-2 text-sm font-semibold text-text hover:bg-white/5"
            >
              {t("docs.stones.navTitle")}
            </Link>
            <Link
              to="/docs/ai"
              className="rounded-xl border border-border bg-elev px-4 py-2 text-sm font-semibold text-text hover:bg-white/5"
            >
              {t("docs.ai.navTitle")}
            </Link>
            <Link
              to="/docs/workspace"
              className="rounded-xl border border-border bg-elev px-4 py-2 text-sm font-semibold text-text hover:bg-white/5"
            >
              {t("docs.workspace.navTitle")}
            </Link>
            <Link
              to="/docs/team"
              className="rounded-xl border border-border bg-elev px-4 py-2 text-sm font-semibold text-text hover:bg-white/5"
            >
              {t("docs.team.navTitle")}
            </Link>
          </div>
        </DocsSection>

        <footer className="border-t border-border pt-8 text-center text-xs text-mute">
          <Link to="/docs" className="text-dim hover:text-text">
            ← {t("docs.nav.allDocs")}
          </Link>
        </footer>
      </div>
    </DocsShell>
  );
}
