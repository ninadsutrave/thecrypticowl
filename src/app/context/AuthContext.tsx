import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, syncLocalStatsToSupabase } from '../../lib/supabase';
import { getStoredStreakData } from '../hooks/useStreak';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isSignedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toAppUser(u: User): AppUser {
  return {
    id: u.id,
    name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? '',
    email: u.email ?? '',
    picture: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? '',
  };
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isSignedIn: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Keep session in sync with Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        // On first sign-in, push any local progress to Supabase
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const localData = getStoredStreakData();
          await syncLocalStatsToSupabase(session.user.id, localData);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!isSupabaseConfigured) {
      console.warn('[auth] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable sign-in.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ? toAppUser(session.user) : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, isSignedIn: !!session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
