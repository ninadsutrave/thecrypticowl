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
  signOut: () => void; // synchronous — never awaited
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
  signOut: () => {},
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      // On first sign-in, push any local progress to Supabase
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const localData = getStoredStreakData();
        await syncLocalStatsToSupabase(session.user.id, localData);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!isSupabaseConfigured) {
      console.warn(
        '[auth] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable sign-in.'
      );
      return;
    }
    // skipBrowserRedirect=true so Supabase returns the OAuth URL without
    // navigating the current tab. We open it in a small popup instead.
    // When the popup completes auth it redirects to window.location.origin,
    // which writes the session to localStorage. Supabase's onAuthStateChange
    // picks up the storage event and fires SIGNED_IN in the parent window.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error || !data?.url) return;
    const popup = window.open(
      data.url,
      'google-signin',
      'width=500,height=620,popup=yes,left=' +
        Math.round(window.screenX + (window.outerWidth - 500) / 2) +
        ',top=' +
        Math.round(window.screenY + (window.outerHeight - 620) / 2)
    );
    // Fallback: if the browser blocked the popup, do a full redirect
    if (!popup) window.location.href = data.url;
  };

  const signOut = () => {
    // ── Step 1: wipe localStorage synchronously ──────────────────────────────
    // Supabase v2 stores the session under keys prefixed "sb-<project-ref>-".
    // Removing them now guarantees that getSession() returns null on the very
    // next page load, regardless of what the SDK does afterward.
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));

    // ── Step 2: fire-and-forget server-side token revocation ─────────────────
    // NEVER awaited. The Supabase JS v2 SDK acquires a Web Lock before it
    // clears storage, and that lock can hang indefinitely (especially when
    // another tab holds it). Awaiting signOut() freezes the button with no
    // visible feedback. We already cleared the local tokens above, so the
    // server call is purely best-effort cleanup.
    if (isSupabaseConfigured) {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }

    // ── Step 3: hard-navigate to home ────────────────────────────────────────
    // React Router navigate() won't help here because we want to guarantee a
    // full page reload — which re-initialises AuthProvider with a clean state
    // and finds no session tokens in localStorage.
    window.location.href = '/';
  };

  const user = session?.user ? toAppUser(session.user) : null;

  return (
    <AuthContext.Provider
      value={{ user, session, loading, isSignedIn: !!session, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
