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
import { LandingPreviewStage } from "../components/landing/LandingPreviews";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

export default function LandingPage() {
  const { user, loading, needsUsernameSetup } = useAuth();
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
      setWaitMsg(res.message || "¡Apuntado!");
      setEmail("");
    } catch (err) {
      setWaitErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg text-text">
      {/* ambient */}
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

      {/* header */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/15 text-lg">
            🪨
          </span>
          <div>
            <div className="text-sm font-extrabold tracking-tight">
              Piedra a Piedra
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-mute">
              roadmap · XP · equipo
            </div>
          </div>
        </div>
        <Link
          to="/login"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-dim transition hover:border-white/20 hover:text-text"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 pb-24 sm:px-6">
        {/* hero asymmetric */}
        <section className="grid w-full min-w-0 max-w-full items-center gap-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-10">
          <div className="relative min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
              <Sparkles size={12} /> Solo por invitación
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              Convierte el roadmap
              <br />
              en una{" "}
              <span className="bg-gradient-to-r from-accent via-amber-200 to-orange-400 bg-clip-text text-transparent">
                partida
              </span>{" "}
              con tu equipo.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-dim sm:text-lg">
              Piedras (milestones), tareas con XP, Kanban, Timeline y Panel.
              Invita por <span className="text-text">@username</span> — el email
              se queda privado. Gamificado, multi‑proyecto, en la nube.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/20 px-5 py-3 text-sm font-bold text-text shadow-lg shadow-amber-500/10 transition hover:bg-accent/30"
              >
                Pedir invitación <ArrowRight size={16} />
              </a>
              <a
                href="#preview"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-dim hover:border-white/20 hover:text-text"
              >
                Ver preview
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              {[
                { n: "LVL↑", l: "XP al completar" },
                { n: "@", l: "Invites sin email" },
                { n: "3", l: "Vistas del board" },
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

          <div
            id="preview"
            className="w-full min-w-0 max-w-full lg:translate-y-4"
          >
            <LandingPreviewStage />
          </div>
        </section>

        {/* features bento */}
        <section className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Layers size={18} className="text-accent" />,
              t: "Piedra a piedra",
              d: "Milestones con color, fechas y tareas anidadas. Progreso visual al instante.",
            },
            {
              icon: <Gamepad2 size={18} className="text-emerald-400" />,
              t: "Gamificación real",
              d: "XP, niveles y recompensas al cerrar tareas. El roadmap se siente vivo.",
            },
            {
              icon: <Users size={18} className="text-sky-400" />,
              t: "Equipo privado",
              d: "Invita por @username. Roles owner / admin / member y ownership transferible.",
            },
            {
              icon: <Crown size={18} className="text-violet-400" />,
              t: "Multi‑proyecto",
              d: "Crea boards, gestiona miembros y sal o borra con control de peligro.",
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

        {/* waitlist */}
        <section
          id="waitlist"
          className="mt-20 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-elev via-[#12101a] to-[#0a0a12] p-8 sm:p-10"
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Únete a la lista de espera
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-dim sm:text-base">
                Deja tu email. El admin de la plataforma invita por{" "}
                <strong className="text-text">orden de llegada</strong>, en
                lotes, cuando haya hueco. Sin spam: solo el mail de invitación
                de Supabase cuando te toque.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-mute">
                <li>· Acceso invite‑only (sin registro público)</li>
                <li>· Tú eliges @username y contraseña en el alta</li>
                <li>· Puedes rechazar y se borra tu rastro en Auth</li>
              </ul>
            </div>
            <form
              onSubmit={onWaitlist}
              className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-6"
            >
              <label className="block text-xs font-medium text-mute">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
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
                {busy ? "Enviando…" : "Apuntarme a la lista"}
              </button>
              <p className="mt-3 text-center text-[11px] text-mute">
                ¿Ya te invitaron?{" "}
                <Link to="/login" className="text-dim underline-offset-2 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-8 text-[11px] text-mute">
          <span>🪨 Piedra a Piedra · invite‑only</span>
          <Link to="/login" className="hover:text-dim">
            Acceso miembros
          </Link>
        </footer>
      </main>
    </div>
  );
}
