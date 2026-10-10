import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  syncLocalStatsToSupabase,
  resetSupabaseClient,
} from '../../lib/supabase';
import { getStoredStreakData, reloadStreakData } from '../hooks/useStreak';
import { clearUserData } from '../lib/localStore';
import { syncPlayHistory } from '../games/playHistory';

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

/** The sign-in popup's window name, so the app inside it knows to close. */
const SIGN_IN_WINDOW = 'google-signin';

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

    let subscription: { unsubscribe: () => void } | null = null;

    // Defer session restoration until after LCP so we're not contending with
    // hydration for main-thread time. `getSupabaseClient()` also dynamic-imports
    // the Supabase SDK chunk on first call, keeping it out of the initial bundle.
    // This window is the sign-in popup (see signIn): once Supabase has read
    // the session from the redirect, the opener picks it up from storage and
    // this copy of the app has nothing left to do.
    const inPopup = window.name === SIGN_IN_WINDOW && !!window.opener;
    const closePopup = () => {
      if (inPopup) window.close();
    };

    const run = async () => {
      const supabase = await getSupabaseClient();

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
        if (session) closePopup();
      });

      subscription = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        if (inPopup) {
          if (session) closePopup();
          return; // the opener does the syncing
        }

        // On first sign-in, push any local progress to Supabase
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const localData = getStoredStreakData();
          await syncLocalStatsToSupabase(session.user.id, localData);
          // Every game's play history, both ways (see games/playHistory.ts).
          // Best-effort: a failed sync retries on the next page load.
          await syncPlayHistory(session.user.id).catch(err =>
            console.warn('[auth] play history sync failed:', err?.message ?? err)
          );
        }
      }).data.subscription;
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    if (typeof w.requestIdleCallback === 'function') {
      idleHandle = w.requestIdleCallback(run, { timeout: 1500 });
    } else {
      timeoutHandle = setTimeout(run, 800);
    }

    return () => {
      if (idleHandle != null && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle != null) clearTimeout(timeoutHandle);
      subscription?.unsubscribe();
    };
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
    const supabase = await getSupabaseClient();
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
      SIGN_IN_WINDOW,
      'width=500,height=620,popup=yes,left=' +
        Math.round(window.screenX + (window.outerWidth - 500) / 2) +
        ',top=' +
        Math.round(window.screenY + (window.outerHeight - 620) / 2)
    );
    // Fallback: if the browser blocked the popup, do a full redirect
    if (!popup) window.location.href = data.url;
  };

  const signOut = () => {
    // ── Step 1: wipe local state synchronously ───────────────────────────────
    // Supabase v2 stores the session under keys prefixed "sb-<project-ref>-";
    // removing them guarantees getSession() returns null on the very next page
    // load regardless of what the SDK does afterward.
    //
    // This also clears the app's own `tco-*` keys. Previously only `sb-*` was
    // removed, so the streak, XP, solve history, reactions and puzzle cache
    // all survived sign-out — and the next person to sign in on the device
    // inherited them, then had them merged up into their own server row.
    clearUserData();
    // Drop the in-memory snapshot too, so nothing re-persists it on the way out.
    reloadStreakData();

    // ── Step 2: fire-and-forget server-side token revocation ─────────────────
    // NEVER awaited. The Supabase JS v2 SDK acquires a Web Lock before it
    // clears storage, and that lock can hang indefinitely (especially when
    // another tab holds it). Awaiting signOut() freezes the button with no
    // visible feedback. We already cleared the local tokens above, so the
    // server call is purely best-effort cleanup.
    if (isSupabaseConfigured) {
      // Fire-and-forget; we've already cleared local tokens above.
      getSupabaseClient()
        .then(supabase => supabase.auth.signOut({ scope: 'local' }))
        .catch(() => {});
    }
    // Drop the cached client so the next getSupabaseClient() builds fresh —
    // defensive even though we hard-reload below.
    resetSupabaseClient();

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
