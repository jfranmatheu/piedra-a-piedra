import { Link } from "react-router-dom";
import DocsShell, {
  DocsKbd,
  DocsPageHeader,
  DocsSection,
} from "../components/docs/DocsShell";
import { useI18n } from "../i18n";

export default function DocsTeamPage() {
  const { t } = useI18n();
  const d = (key) => t(`docs.team.${key}`);

  const toc = [
    { id: "invite-only", label: d("tocInviteOnly") },
    { id: "roles", label: d("tocRoles") },
    { id: "invite", label: d("tocInvite") },
    { id: "username", label: d("tocUsername") },
    { id: "leave", label: d("tocLeave") },
  ];

  return (
    <DocsShell toc={toc}>
      <DocsPageHeader
        eyebrow={d("eyebrow")}
        title={d("title")}
        lead={d("lead")}
      />

      <div className="space-y-12">
        <DocsSection id="invite-only" title={d("inviteOnlyTitle")}>
          <p>{d("inviteOnlyP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("inviteOnlyLi1")}</li>
            <li>{d("inviteOnlyLi2")}</li>
            <li>{d("inviteOnlyLi3")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="roles" title={d("rolesTitle")}>
          <p>{d("rolesP")}</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <DocsKbd>owner</DocsKbd> — {d("roleOwner")}
            </li>
            <li>
              <DocsKbd>admin</DocsKbd> — {d("roleAdmin")}
            </li>
            <li>
              <DocsKbd>member</DocsKbd> — {d("roleMember")}
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="invite" title={d("inviteTitle")}>
          <p>{d("inviteP")}</p>
          <ol className="list-inside list-decimal space-y-2">
            <li>{d("invite1")}</li>
            <li>{d("invite2")}</li>
            <li>{d("invite3")}</li>
          </ol>
          <p>{d("inviteQuota")}</p>
        </DocsSection>

        <DocsSection id="username" title={d("usernameTitle")}>
          <p>{d("usernameP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("usernameLi1")}</li>
            <li>{d("usernameLi2")}</li>
            <li>{d("usernameLi3")}</li>
          </ul>
        </DocsSection>

        <DocsSection id="leave" title={d("leaveTitle")}>
          <p>{d("leaveP")}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>{d("leaveLi1")}</li>
            <li>{d("leaveLi2")}</li>
            <li>{d("leaveLi3")}</li>
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
