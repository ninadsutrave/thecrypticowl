import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { isSupabaseConfigured } from '../../lib/supabase';
import { GoogleIcon } from './GoogleIcon';
import { Mascot } from './Mascot';

/**
 * Stands in for a page that needs an account, such as the puzzle archive.
 * Sign-in runs in a popup, so this page re-renders as the real thing once
 * it completes: nobody loses the link they opened.
 */
export function SignInPrompt({
  title = 'Sign in to open the archive',
  body = 'Every past puzzle is waiting for you. Sign in with Google to play any day you missed.',
}: {
  title?: string;
  body?: string;
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { signIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" aria-label="Loading">
        <div
          className="h-6 w-6 rounded-full border-[3px] animate-spin"
          style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div
        className="rounded-3xl border p-6 sm:p-8 text-center"
        style={{ background: T.cardBg, borderColor: T.cardBorder, boxShadow: T.shadowCard }}
      >
        <div className="flex justify-center mb-4">
          <Mascot mood="thinking" size={84} animate={false} />
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-xs font-extrabold"
          style={{ background: T.brandSurface, color: T.brandText }}
        >
          <Lock size={12} aria-hidden /> Members only
        </span>
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.5rem',
            color: T.heading,
            marginBottom: 6,
          }}
        >
          {title}
        </h1>
        <p style={{ color: T.textMuted, fontSize: '0.92rem', lineHeight: 1.55, marginBottom: 20 }}>
          {body}
        </p>
        <button
          onClick={signIn}
          disabled={!isSupabaseConfigured}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-extrabold border-2 disabled:opacity-60"
          style={{ background: T.cardBg, borderColor: T.cardBorderStrong, color: T.text }}
        >
          <GoogleIcon /> Sign in with Google
        </button>
        <Link
          to="/"
          className="inline-block mt-4 text-sm font-bold no-underline hover:underline"
          style={{ color: T.brandText }}
        >
          Back to today's puzzles
        </Link>
      </div>
    </div>
  );
}
