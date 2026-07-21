import { Link } from "react-router-dom";
import DocsShell, {
  DocsKbd,
  DocsPageHeader,
  DocsSection,
} from "../components/docs/DocsShell";
import { useI18n } from "../i18n";

export default function DocsWorkspacePage() {
  const { t } = useI18n();
  const d = (key) => t(`docs.workspace.${key}`);

  const toc = [
    { id: "overview", label: d("tocOverview") },
    { id: "kanban", label: d("tocKanban") },
    { id: "timeline", label: d("tocTimeline") },
    { id: "panel", label: d("tocPanel") },
    { id: "tasks", label: d("tocTasks") },
    { id: "xp", label: d("tocXp") },
    { id: "ai", label: d("tocAi") },
    { id: "settings", label: d("tocSettings") },
  ];

  return (
    <DocsShell toc={toc}>
      <DocsPageHeader
        eyebrow={d("eyebrow")}
        title={d("title")}
        lead={d("lead")}
      />

      <div className="space-y-12">
        <DocsSection id="overview" title={d("overviewTitle")}>
          <p>{d("overviewP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("overviewLi1")}</li>
            <li>{d("overviewLi2")}</li>
            <li>{d("overviewLi3")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="kanban" title={d("kanbanTitle")}>
          <p>{d("kanbanP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("kanbanLi1")}</li>
            <li>{d("kanbanLi2")}</li>
            <li>{d("kanbanLi3")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="timeline" title={d("timelineTitle")}>
          <p>{d("timelineP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("timelineLi1")}</li>
            <li>{d("timelineLi2")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="panel" title={d("panelTitle")}>
          <p>{d("panelP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("panelLi1")}</li>
            <li>{d("panelLi2")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="tasks" title={d("tasksTitle")}>
          <p>{d("tasksP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <DocsKbd>{d("tasksTitleField")}</DocsKbd> — {d("tasksTitleD")}
            </li>
            <li>
              <DocsKbd>{d("tasksDesc")}</DocsKbd> — {d("tasksDescD")}
            </li>
            <li>
              <DocsKbd>XP</DocsKbd> — {d("tasksXpD")}
            </li>
            <li>
              <DocsKbd>{d("tasksDates")}</DocsKbd> — {d("tasksDatesD")}
            </li>
            <li>
              <DocsKbd>{d("tasksAssignees")}</DocsKbd> — {d("tasksAssigneesD")}
            </li>
            <li>
              <DocsKbd>{d("tasksImage")}</DocsKbd> — {d("tasksImageD")}
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="xp" title={d("xpTitle")}>
          <p>{d("xpP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("xpLi1")}</li>
            <li>{d("xpLi2")}</li>
            <li>{d("xpLi3")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="ai" title={d("aiTitle")}>
          <p>{d("aiP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("aiLi1")}</li>
            <li>{d("aiLi2")}</li>
            <li>
              {d("aiLi3")}{" "}
              <Link to="/docs/ai" className="text-accent hover:underline">
                {t("docs.ai.navTitle")}
              </Link>
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="settings" title={d("settingsTitle")}>
          <p>{d("settingsP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("settingsLi1")}</li>
            <li>
              {d("settingsLi2")}{" "}
              <Link to="/docs/stones" className="text-accent hover:underline">
                .stones
              </Link>
            </li>
            <li>{d("settingsLi3")}</li>
          </ul>
        </DocsSection>

        <footer className="border-t border-border pt-8 text-center text-xs text-mute">
          <Link to="/docs" className="text-dim hover:text-text">
            ← {t("docs.nav.allDocs")}
          </Link>
          {" · "}
          <Link to="/docs/ai" className="text-dim hover:text-text">
            {t("docs.ai.navTitle")}
          </Link>
          {" · "}
          <Link to="/docs/team" className="text-dim hover:text-text">
            {t("docs.team.navTitle")}
          </Link>
        </footer>
      </div>
    </DocsShell>
  );
}
