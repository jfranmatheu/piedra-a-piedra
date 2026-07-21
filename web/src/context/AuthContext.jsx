import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import * as api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          try {
            const p = await api.getProfile(data.session.user.id);
            if (mounted) setProfile(p);
          } catch (e) {
            console.warn("[piedra] profile load failed:", e?.message || e);
            if (mounted) setProfile(null);
          }
        }
      } catch (e) {
        console.error("[piedra] getSession failed:", e?.message || e);
        if (mounted) {
          setAuthError(e?.message || String(e));
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        try {
          const p = await api.getProfile(sess.user.id);
          if (mounted) setProfile(p);
        } catch (e) {
          console.warn("[piedra] profile load failed:", e?.message || e);
          if (mounted) setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => {
    // Only force onboarding when the column exists and is explicitly false
    // (missing column / undefined → no block, app still works pre-migration)
    const needsUsernameSetup =
      !!profile && profile.username_setup_done === false;

    return {
      session,
      user: session?.user || null,
      profile,
      loading,
      authError,
      isPlatformAdmin: !!profile?.is_platform_admin,
      needsUsernameSetup,
      signIn: api.signIn,
      signOut: api.signOut,
      refreshProfile: async () => {
        if (!session?.user) return;
        const p = await api.getProfile(session.user.id);
        setProfile(p);
        return p;
      },
      setProfileLocal: setProfile,
    };
  }, [session, profile, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
