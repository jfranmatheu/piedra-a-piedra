import {
  ArrowRight,
  Crown,
  Gamepad2,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { LandingPreviewStage } from "../components/landing/LandingPreviews";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import * as api from "../lib/api";

export default function LandingPage() {
  const { user, loading, needsUsernameSetup } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [waitMsg, setWaitMsg] = useState(null);
  const [waitErr, setWaitErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    if (needsUsernameSetup) return <Navigate to="/join" replace />;
    return <Navigate to="/projects" replace />;
  }

  const onWaitlist = async (e) => {
    e.preventDefault();
    setWaitMsg(null);
    setWaitErr(null);
    setBusy(true);
    try {
      const res = await api.joinWaitlist(email.trim());
      setWaitMsg(res.message || "OK");
      setEmail("");
    } catch (err) {
      setWaitErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg text-text">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-violet-600/10 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/15 text-lg">
            🪨
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-tight">
              Piedra a Piedra
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-mute">
              {t("landing.tagline")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-dim transition hover:border-white/20 hover:text-text sm:px-4"
          >
            {t("common.login")}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 pb-24 sm:px-6">
        <section className="grid w-full min-w-0 max-w-full items-center gap-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-10">
          <div className="relative min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
              <Sparkles size={12} /> {t("landing.inviteOnly")}
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              {t("landing.heroTitle1")}
              <br />
              {t("landing.heroTitle2")}{" "}
              <span className="bg-gradient-to-r from-accent via-amber-200 to-orange-400 bg-clip-text text-transparent">
                {t("landing.heroTitle3")}
              </span>{" "}
              {t("landing.heroTitle4")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-dim sm:text-lg">
              {t("landing.heroBody")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/20 px-5 py-3 text-sm font-bold text-text shadow-lg shadow-amber-500/10 transition hover:bg-accent/30"
              >
                {t("landing.ctaWaitlist")} <ArrowRight size={16} />
              </a>
              <a
                href="#preview"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-dim hover:border-white/20 hover:text-text"
              >
                {t("landing.ctaPreview")}
              </a>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                { n: "LVL↑", l: t("landing.statXp") },
                { n: "@", l: t("landing.statInvites") },
                { n: "3", l: t("landing.statViews") },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center"
                >
                  <div className="font-mono text-lg font-bold text-accent">
                    {s.n}
                  </div>
                  <div className="text-[10px] text-mute">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div id="preview" className="w-full min-w-0 max-w-full lg:translate-y-4">
            <LandingPreviewStage />
          </div>
        </section>

        <section className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Layers size={18} className="text-accent" />,
              t: t("landing.featStones"),
              d: t("landing.featStonesBody"),
            },
            {
              icon: <Gamepad2 size={18} className="text-emerald-400" />,
              t: t("landing.featGame"),
              d: t("landing.featGameBody"),
            },
            {
              icon: <Users size={18} className="text-sky-400" />,
              t: t("landing.featTeam"),
              d: t("landing.featTeamBody"),
            },
            {
              icon: <Crown size={18} className="text-violet-400" />,
              t: t("landing.featMulti"),
              d: t("landing.featMultiBody"),
            },
          ].map((f) => (
            <article
              key={f.t}
              className="group rounded-3xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent p-5 transition hover:border-accent/25"
            >
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/30">
                {f.icon}
              </div>
              <h3 className="font-bold tracking-tight">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{f.d}</p>
            </article>
          ))}
        </section>

        <section
          id="waitlist"
          className="mt-20 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-elev via-[#12101a] to-[#0a0a12] p-8 sm:p-10"
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {t("landing.waitTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-dim sm:text-base">
                {t("landing.waitBody")}
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-mute">
                <li>{t("landing.waitBullet1")}</li>
                <li>{t("landing.waitBullet2")}</li>
                <li>{t("landing.waitBullet3")}</li>
              </ul>
            </div>
            <form
              onSubmit={onWaitlist}
              className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-6"
            >
              <label className="block text-xs font-medium text-mute">
                {t("common.email")}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-1.5 w-full rounded-xl border border-border bg-black/50 px-4 py-3 text-sm outline-none focus:border-accent/50"
                />
              </label>
              {waitMsg && (
                <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {waitMsg}
                </p>
              )}
              {waitErr && (
                <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {waitErr}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-xl border border-accent/40 bg-accent/25 py-3 text-sm font-bold hover:bg-accent/35 disabled:opacity-50"
              >
                {busy ? t("common.sending") : t("landing.waitSubmit")}
              </button>
              <p className="mt-3 text-center text-[11px] text-mute">
                {t("landing.waitAlready")}{" "}
                <Link
                  to="/login"
                  className="text-dim underline-offset-2 hover:underline"
                >
                  {t("common.login")}
                </Link>
              </p>
            </form>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-8 text-[11px] text-mute">
          <span>🪨 {t("landing.footer")}</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login" className="hover:text-dim">
              {t("common.membersAccess")}
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
