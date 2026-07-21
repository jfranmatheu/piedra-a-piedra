import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { detectLanguage, persistLanguage, SUPPORTED_LANGS } from "./detect";
import en from "./locales/en.json";
import es from "./locales/es.json";

const catalogs = { en, es };

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Simple {{var}} interpolation.
 */
export function interpolate(str, vars = {}) {
  if (str == null) return "";
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ""
  );
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => detectLanguage());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
    persistLanguage(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const cat = catalogs[lang] || catalogs.en;
      let val = getByPath(cat, key);
      if (val == null) val = getByPath(catalogs.en, key);
      if (val == null) return key;
      if (typeof val !== "string") return String(val);
      return vars ? interpolate(val, vars) : val;
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      langs: SUPPORTED_LANGS,
    }),
    [lang, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}

export { detectLanguage, SUPPORTED_LANGS };
