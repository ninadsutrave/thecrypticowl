import { m } from 'motion/react';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { isSupabaseConfigured } from '../../lib/supabase';
import { GoogleIcon } from './GoogleIcon';
import { Mascot } from './Mascot';

/**
 * The sign-in screen for every members-only page (Progress, Archive, past
 * puzzles, Profile): what an account gets you, and the Google button.
 * Sign-in runs in a popup, so the page it guards opens itself once it
 * completes and nobody loses the link they followed.
 */
export function SignInGate() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { signIn, loading } = useAuth();

  const features = [
    { icon: '📅', label: 'Play any past puzzle from the archive' },
    { icon: '📊', label: 'Track your solve history & stats' },
    { icon: '🔥', label: 'Keep your streak across devices' },
  ];

  // Don't flash the gate while a returning user's session is restoring.
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
    <div
      className="flex flex-col items-center justify-center px-4 py-12 relative"
      style={{ background: T.pageBg, minHeight: '60vh' }}
    >
      {/* Floating bg */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        {['P', 'R', 'O', 'G', 'R', 'E', 'S', 'S', '★'].map((char, i) => (
          <m.div
            key={i}
            className="absolute select-none"
            style={{
              left: `${10 + i * 10}%`,
              top: `${10 + (i % 3) * 30}%`,
              fontSize: 40 + (i % 3) * 12,
              color: ['#C4B5FD', '#A7F3D0', '#FDE68A'][i % 3],
              fontFamily: "'Outfit', sans-serif",
              opacity: isDark ? 0.05 : 0.1,
            }}
            animate={{ y: [0, -14, 0], rotate: [0, 4, -4, 0] }}
            transition={{
              duration: 5 + i * 0.5,
              delay: i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {char}
          </m.div>
        ))}
      </div>

      <m.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="rounded-3xl border p-6 text-center"
          style={{
            background: T.cardBg,
            borderColor: T.cardBorder,
            boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(124,58,237,0.08)',
          }}
        >
          <div className="flex justify-center mb-4">
            <Mascot
              mood="thinking"
              size={90}
              speechBubble="Sign in to unlock!"
              bubbleDirection="right"
            />
          </div>

          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{
              background: T.brandSurface,
              border: `2px solid ${T.brandBorder}`,
            }}
          >
            <Lock size={24} style={{ color: T.brandText }} />
          </div>

          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.8rem',
              color: T.heading,
              marginBottom: '0.5rem',
            }}
          >
            Unlock Your Progress
          </h1>
          <p
            style={{
              color: T.textMuted,
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}
          >
            Sign in with Google to access your puzzle history, stats, and personal progress.
          </p>

          <div className="text-left mb-6 flex flex-col gap-2">
            {features.map((f, i) => (
              <m.div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: isDark ? '#1C1B24' : '#F9F7FF' }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
              >
                <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                <span style={{ color: T.textSub, fontSize: '0.88rem', fontWeight: 600 }}>
                  {f.label}
                </span>
              </m.div>
            ))}
          </div>

          {!isSupabaseConfigured ? (
            <div
              className="rounded-xl p-3 text-sm text-left"
              style={{
                background: T.fodderBg,
                color: isDark ? '#FB923C' : '#C2410C',
                border: `1px solid ${isDark ? '#7C2D12' : '#FED7AA'}`,
              }}
            >
              <strong>Dev:</strong> Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> — see{' '}
              <code>.env.example</code>.
            </div>
          ) : (
            <m.button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-bold"
              style={{
                background: isDark ? '#fff' : '#fff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <GoogleIcon />
              Sign in with Google
            </m.button>
          )}

          <p style={{ color: T.textFaint, fontSize: '0.78rem', marginTop: '1rem' }}>
            Sign in to save your streak and stats across devices.
          </p>
        </div>
      </m.div>
    </div>
  );
}
