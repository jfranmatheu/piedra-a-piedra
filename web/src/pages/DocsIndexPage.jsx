import {
  ArrowRight,
  BookOpen,
  FileCode2,
  LayoutGrid,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import DocsShell, { DocsPageHeader } from "../components/docs/DocsShell";
import { DOCS_CATALOG, DOCS_CATEGORIES } from "../docs/catalog";
import { useI18n } from "../i18n";

const ICONS = {
  rocket: Rocket,
  fileCode: FileCode2,
  layout: LayoutGrid,
  users: Users,
  sparkles: Sparkles,
};

export default function DocsIndexPage() {
  const { t } = useI18n();

  return (
    <DocsShell>
      <DocsPageHeader
        eyebrow={t("docs.hub.eyebrow")}
        title={t("docs.hub.title")}
        lead={t("docs.hub.lead")}
      />

      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-elev/60 p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mute">
            {t("docs.hub.statGuides")}
          </div>
          <div className="text-2xl font-black text-text">{DOCS_CATALOG.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-elev/60 p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mute">
            {t("docs.hub.statFormat")}
          </div>
          <div className="text-2xl font-black text-accent">.stones</div>
        </div>
        <div className="rounded-2xl border border-border bg-elev/60 p-4">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mute">
            {t("docs.hub.statLang")}
          </div>
          <div className="text-2xl font-black text-text">ES · EN</div>
        </div>
      </div>

      {DOCS_CATEGORIES.map((cat) => {
        const items = DOCS_CATALOG.filter((d) => d.category === cat.id);
        if (!items.length) return null;
        return (
          <section key={cat.id} className="mb-10">
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-mute">
              {t(`docs.hub.${cat.i18n}`)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const Icon = ICONS[item.icon] || BookOpen;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={[
                      "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition",
                      "hover:border-white/20 hover:shadow-lg hover:shadow-black/20",
                      item.border,
                      item.accent,
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-text">
                        <Icon size={18} />
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-mute transition group-hover:translate-x-0.5 group-hover:text-text"
                      />
                    </div>
                    <h3 className="text-base font-bold text-text">
                      {t(`docs.${item.i18n}.navTitle`)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-dim">
                      {t(`docs.${item.i18n}.cardDesc`)}
                    </p>
                    {item.id === "stones" && (
                      <span className="mt-3 inline-block rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                        .stones
                      </span>
                    )}
                    {item.id === "ai" && (
                      <span className="mt-3 inline-block rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 font-mono text-[10px] text-fuchsia-300">
                        NVIDIA NIM
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-border bg-elev/40 p-6">
        <h2 className="mb-2 text-lg font-bold text-text">{t("docs.hub.helpTitle")}</h2>
        <p className="mb-4 text-sm text-dim">{t("docs.hub.helpBody")}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/docs/start"
            className="rounded-xl border border-accent/35 bg-accent/15 px-4 py-2 text-sm font-semibold text-text hover:bg-accent/25"
          >
            {t("docs.hub.helpStart")}
          </Link>
          <Link
            to="/docs/stones"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-dim hover:bg-white/5 hover:text-text"
          >
            {t("docs.hub.helpStones")}
          </Link>
          <Link
            to="/docs/ai"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-dim hover:bg-white/5 hover:text-text"
          >
            {t("docs.hub.helpAi")}
          </Link>
        </div>
      </section>

      <footer className="mt-12 border-t border-border pt-8 text-center text-xs text-mute">
        <Link to="/" className="text-dim hover:text-text">
          ← {t("docs.nav.backHome")}
        </Link>
        {" · "}
        <Link to="/projects" className="text-dim hover:text-text">
          {t("common.projects")}
        </Link>
      </footer>
    </DocsShell>
  );
}
