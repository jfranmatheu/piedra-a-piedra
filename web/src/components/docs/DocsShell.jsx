import {
  BookOpen,
  FileCode2,
  LayoutGrid,
  Menu,
  Rocket,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import LanguageSwitcher from "../LanguageSwitcher";
import { DOCS_CATALOG } from "../../docs/catalog";
import { useI18n } from "../../i18n";

const ICONS = {
  rocket: Rocket,
  fileCode: FileCode2,
  layout: LayoutGrid,
  users: Users,
  sparkles: Sparkles,
};

function NavItem({ item, onNavigate }) {
  const { t } = useI18n();
  const Icon = ICONS[item.icon] || BookOpen;
  const title = t(`docs.${item.i18n}.navTitle`);
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
          isActive
            ? "bg-accent/15 font-semibold text-accent"
            : "text-dim hover:bg-white/5 hover:text-text",
        ].join(" ")
      }
    >
      <Icon size={15} className="shrink-0 opacity-80" />
      <span className="truncate">{title}</span>
    </NavLink>
  );
}

export default function DocsShell({ children, toc = null }) {
  const { t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isIndex = location.pathname === "/docs" || location.pathname === "/docs/";

  const sidebar = (
    <div className="space-y-6">
      <div>
        <Link
          to="/docs"
          onClick={() => setMobileOpen(false)}
          className={[
            "mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
            isIndex
              ? "bg-white/10 text-text"
              : "text-dim hover:bg-white/5 hover:text-text",
          ].join(" ")}
        >
          <BookOpen size={15} className="text-accent" />
          {t("docs.nav.allDocs")}
        </Link>
        <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-widest text-mute">
          {t("docs.nav.guides")}
        </div>
        <nav className="space-y-0.5">
          {DOCS_CATALOG.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </div>

      {toc && toc.length > 0 && (
        <div className="hidden lg:block">
          <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-widest text-mute">
            {t("docs.nav.onThisPage")}
          </div>
          <nav className="space-y-0.5">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block truncate rounded-lg px-3 py-1.5 text-xs text-dim transition hover:bg-white/5 hover:text-text"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-elev/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="rounded-lg border border-border p-1.5 text-dim hover:text-text lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link
              to="/"
              className="shrink-0 text-sm text-mute hover:text-text"
            >
              Piedra a Piedra
            </Link>
            <span className="hidden text-mute sm:inline">/</span>
            <Link
              to="/docs"
              className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold"
            >
              <BookOpen size={15} className="shrink-0 text-accent" />
              <span className="truncate">{t("docs.nav.docs")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/projects"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-dim hover:text-text"
            >
              {t("common.projects")}
            </Link>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="border-b border-border bg-elev px-4 py-4 lg:hidden">
          {sidebar}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">{sidebar}</div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function DocsSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-bold tracking-tight text-text">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-dim">{children}</div>
    </section>
  );
}

export function DocsCode({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-black/50 p-4 font-mono text-[12px] leading-relaxed text-dim">
      <code>{children}</code>
    </pre>
  );
}

export function DocsKbd({ children }) {
  return (
    <code className="rounded-md border border-border bg-black/40 px-1.5 py-0.5 font-mono text-[12px] text-accent">
      {children}
    </code>
  );
}

export function DocsPageHeader({ eyebrow, title, lead }) {
  return (
    <div className="mb-10">
      {eyebrow && (
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">
          {eyebrow}
        </div>
      )}
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      {lead && <p className="mt-3 max-w-2xl text-base text-dim">{lead}</p>}
    </div>
  );
}
