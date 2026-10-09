import { m } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { getTheme } from '../theme';
import { useDarkMode } from '../context/DarkModeContext';
import { Home, Search } from 'lucide-react';
import { NavLink } from 'react-router';

export function NotFound() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);

  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <m.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div className="mb-8 relative">
          <m.div
            animate={{
              rotate: [0, -10, 10, -10, 0],
              y: [0, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Mascot
              mood="thinking"
              size={160}
              speechBubble="Whooops! Where am I?"
              bubbleDirection="right"
            />
          </m.div>
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 blur-xl rounded-full opacity-20"
            style={{ background: T.brandStrong }}
          />
        </div>

        <h1
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '4rem',
            color: T.brandStrong,
            lineHeight: 1,
            marginBottom: '1rem',
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '1.5rem',
            color: T.text,
            marginBottom: '1.5rem',
          }}
        >
          Page Not Found!
        </h2>

        <p
          style={{
            color: T.textMuted,
            fontSize: '1.1rem',
            maxWidth: '400px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6,
          }}
        >
          Ollie looked everywhere, but this page seems to have vanished into thin air. Perhaps it's
          an anagram we can't solve?
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NavLink to="/" className="no-underline w-full sm:w-auto">
            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold w-full"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                color: 'white',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
              }}
            >
              <Home size={18} />
              Back Home
            </m.button>
          </NavLink>

          <NavLink to="/cryptic" className="no-underline w-full sm:w-auto">
            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold border-2 w-full"
              style={{
                borderColor: T.brandBorder,
                color: T.brandText,
                background: T.brandSurface,
              }}
            >
              <Search size={18} />
              Today's cryptic
            </m.button>
          </NavLink>
        </div>
      </m.div>
    </div>
  );
}
