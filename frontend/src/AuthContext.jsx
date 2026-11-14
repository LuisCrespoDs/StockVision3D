import React, { createContext, useContext, useEffect, useState } from "react";
import api from "./api";
import { supabase, supabaseConfigured } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (token) => {
    try {
      const { data } = await api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setProfile(data);
      return true;
    } catch {
      setProfile(null);
      return false;
    }
  };

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    let alive = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const current = data.session;
      setSession(current);
      if (current?.access_token) await loadProfile(current.access_token);
      if (alive) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.access_token) {
        setLoading(true);
        window.setTimeout(async () => {
          if (alive) await loadProfile(nextSession.access_token);
          if (alive) setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.access_token) await loadProfile(session.access_token);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
