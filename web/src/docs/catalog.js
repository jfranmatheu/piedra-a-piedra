/**
 * Catálogo de documentación — raíz y subpáginas.
 * Añadir una entrada aquí + ruta en App.jsx + i18n + página.
 */
export const DOCS_CATALOG = [
  {
    id: "start",
    path: "/docs/start",
    i18n: "start",
    category: "basics",
    icon: "rocket",
    accent: "from-amber-500/20 to-orange-600/10",
    border: "border-amber-500/25",
  },
  {
    id: "stones",
    path: "/docs/stones",
    i18n: "stones",
    category: "formats",
    icon: "fileCode",
    accent: "from-cyan-500/20 to-sky-600/10",
    border: "border-cyan-500/25",
  },
  {
    id: "workspace",
    path: "/docs/workspace",
    i18n: "workspace",
    category: "app",
    icon: "layout",
    accent: "from-violet-500/20 to-purple-600/10",
    border: "border-violet-500/25",
  },
  {
    id: "team",
    path: "/docs/team",
    i18n: "team",
    category: "app",
    icon: "users",
    accent: "from-emerald-500/20 to-teal-600/10",
    border: "border-emerald-500/25",
  },
];

export const DOCS_CATEGORIES = [
  { id: "basics", i18n: "catBasics" },
  { id: "formats", i18n: "catFormats" },
  { id: "app", i18n: "catApp" },
];

export function getDocByPath(pathname) {
  return DOCS_CATALOG.find((d) => d.path === pathname) || null;
}

export function getDocById(id) {
  return DOCS_CATALOG.find((d) => d.id === id) || null;
}
