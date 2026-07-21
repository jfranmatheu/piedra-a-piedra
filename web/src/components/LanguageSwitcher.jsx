import { useI18n } from "../i18n";

/**
 * Compact ES | EN control. variant: "subtle" | "solid"
 */
export default function LanguageSwitcher({ className = "", variant = "subtle" }) {
  const { lang, setLang, t } = useI18n();

  const base =
    variant === "solid"
      ? "rounded-full border border-white/10 bg-black/40 p-0.5"
      : "rounded-full border border-white/10 bg-white/[0.04] p-0.5";

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${base} ${className}`}
      role="group"
      aria-label={t("lang.switchTo")}
    >
      {["es", "en"].map((code) => {
        const on = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              on
                ? "bg-accent/25 text-accent"
                : "text-mute hover:text-dim"
            }`}
            aria-pressed={on}
          >
            {t(`lang.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
