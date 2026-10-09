import { useState } from 'react';
import { m } from 'motion/react';
import { WifiOff, RotateCcw } from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { getTheme } from '../theme';
import { useDarkMode } from '../context/DarkModeContext';

/**
 * Shown when the browser reports no network connection.
 *
 * Deliberately not a dead end. Progress is kept in the browser, so anything
 * solved before the connection dropped is safe and syncs on reconnect — saying
 * so is the most useful thing this screen can do, because the alternative is a
 * solver assuming their streak is gone.
 *
 * The page recovers on its own: `useOnlineStatus` is driven by the browser's
 * `online` event, so this unmounts the moment the connection returns without
 * anyone pressing anything.
 */
export function NoInternet({ onRetry }: { onRetry?: () => void }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    if (onRetry) {
      onRetry();
      // Just long enough to read as a response to the click.
      setTimeout(() => setRetrying(false), 600);
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center"
      style={{ fontFamily: "'Nunito', sans-serif" }}
      role="alert"
      aria-live="polite"
    >
      <m.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex flex-col items-center"
      >
        <div className="mb-7 relative">
          <m.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Mascot
              mood="thinking"
              size={150}
              speechBubble="Hoo… no signal!"
              bubbleDirection="right"
            />
          </m.div>
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 h-4 blur-xl rounded-full opacity-20"
            style={{ background: T.brandStrong }}
          />
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-5"
          style={{ background: T.brandSurface, borderColor: T.brandBorder }}
          aria-hidden
        >
          <WifiOff size={14} style={{ color: T.brand }} />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: T.brandText,
            }}
          >
            OFFLINE
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(1.6rem, 6vw, 2.2rem)',
            color: T.heading,
            lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}
        >
          You're not connected
        </h1>

        <p
          style={{
            color: T.textMuted,
            fontWeight: 600,
            fontSize: '0.98rem',
            lineHeight: 1.65,
            maxWidth: 420,
            marginBottom: '1.75rem',
          }}
        >
          We can't fetch today's puzzles without a connection. Check your Wi-Fi or mobile data —
          this page will come back on its own the moment you're back online.
        </p>

        <div
          className="rounded-2xl border px-5 py-4 mb-7"
          style={{
            background: T.successBg,
            borderColor: T.successBorder,
            maxWidth: 420,
          }}
        >
          <p
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: isDark ? '#6EE7B7' : '#065F46',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            🔥 Your streak is safe
          </p>
          <p
            style={{
              fontSize: '0.85rem',
              color: T.textMuted,
              fontWeight: 600,
              lineHeight: 1.6,
              margin: '4px 0 0',
            }}
          >
            Everything you've solved is stored on this device and syncs to your account
            automatically once you reconnect.
          </p>
        </div>

        <m.button
          onClick={handleRetry}
          disabled={retrying}
          whileHover={{ scale: retrying ? 1 : 1.04 }}
          whileTap={{ scale: retrying ? 1 : 0.96 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: '#FFFFFF',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
            fontSize: '0.95rem',
            border: 'none',
            cursor: retrying ? 'default' : 'pointer',
            opacity: retrying ? 0.75 : 1,
          }}
        >
          <m.span
            animate={retrying ? { rotate: 360 } : { rotate: 0 }}
            transition={retrying ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : undefined}
            className="flex"
          >
            <RotateCcw size={16} />
          </m.span>
          {retrying ? 'Checking…' : 'Try again'}
        </m.button>
      </m.div>
    </div>
  );
}
