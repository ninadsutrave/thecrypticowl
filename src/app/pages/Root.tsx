import { Outlet, NavLink, useLocation } from 'react-router';
import { Menu, X, BookOpen, Puzzle as PuzzleNavIcon, Home, Sun, Moon, History, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useStreak } from '../hooks/useStreak';
import { useAuth } from '../context/AuthContext';

function OwlLogoMini() {
  return (
    <svg viewBox="0 0 36 36" width="34" height="34" fill="none">
      <circle cx="18" cy="18" r="18" fill="#EDE9FE" />
      <ellipse cx="18" cy="20" rx="12" ry="13" fill="#C4B5FD" />
      <ellipse cx="18" cy="23" rx="7" ry="9" fill="#EDE9FE" />
      <ellipse cx="12" cy="10" rx="4" ry="7" fill="#A78BFA" transform="rotate(-20 12 10)" />
      <ellipse cx="24" cy="10" rx="4" ry="7" fill="#A78BFA" transform="rotate(20 24 10)" />
      <rect x="9" y="13" width="18" height="3" rx="1.5" fill="#2D1B69" />
      <rect x="12" y="5" width="12" height="10" rx="3" fill="#2D1B69" />
      <rect x="12" y="11" width="12" height="3" fill="#7C3AED" rx="0.5" />
      <circle cx="14" cy="20" r="4.5" fill="white" />
      <circle cx="22" cy="20" r="4.5" fill="white" />
      <circle cx="14" cy="20" r="2.8" fill="#FCD34D" />
      <circle cx="22" cy="20" r="2.8" fill="#FCD34D" />
      <circle cx="14" cy="20" r="1.5" fill="#1E1B4B" />
      <circle cx="22" cy="20" r="1.5" fill="#1E1B4B" />
      <circle cx="15" cy="19" r="0.6" fill="white" />
      <circle cx="23" cy="19" r="0.6" fill="white" />
      <polygon points="18,24 15,27 21,27" fill="#F97316" />
    </svg>
  );
}

export function Root() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const T = getTheme(isDark);
  const { count: streak, refresh: refreshStreak } = useStreak();
  const { user, isSignedIn, signOut } = useAuth();
  const location = useLocation();

  // Close mobile menu and refresh streak on route change
  useEffect(() => {
    setMenuOpen(false);
    refreshStreak();
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home, requiresAuth: false },
    { to: '/learn', label: 'Learn', icon: BookOpen, requiresAuth: false },
    { to: '/puzzle', label: "Today's Puzzle", icon: PuzzleNavIcon, requiresAuth: false },
    { to: '/history', label: 'History', icon: History, requiresAuth: true },
  ];

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: T.pageBg, fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300"
        style={{ background: T.navBg, borderColor: T.navBorder }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 no-underline">
            <OwlLogoMini />
            <span
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1.25rem',
                color: isDark ? '#C4B5FD' : '#5B21B6',
                letterSpacing: '-0.01em',
              }}
            >
              The Cryptic Owl
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, requiresAuth }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm transition-all no-underline font-semibold flex items-center gap-1.5 ${
                    isActive ? 'shadow-md' : ''
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? '#7C3AED' : 'transparent',
                  color: isActive ? 'white' : isDark ? '#C4B5FD' : '#6D28D9',
                  fontFamily: "'Nunito', sans-serif",
                })}
              >
                {label}
                {requiresAuth && !isSignedIn && (
                  <Lock size={11} style={{ opacity: 0.6 }} />
                )}
              </NavLink>
            ))}
          </div>

          {/* Right: Streak + Auth + Dark toggle + Mobile menu */}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <motion.div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border"
              style={{
                background: T.streakBg,
                borderColor: T.streakBorder,
              }}
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-base">🔥</span>
              <span
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: '1rem',
                  color: isDark ? '#FB923C' : '#EA580C',
                }}
              >
                {streak}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: isDark ? '#C2410C' : '#C2410C',
                  fontWeight: 600,
                }}
              >
                streak
              </span>
            </motion.div>

            {/* Auth: avatar or sign-in nudge */}
            <div className="hidden md:flex">
              {isSignedIn && user ? (
                <div className="flex items-center gap-2">
                  <NavLink to="/history" className="no-underline">
                    <motion.img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                      style={{ border: `2px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title={user.name}
                    />
                  </NavLink>
                </div>
              ) : (
                <NavLink
                  to="/history"
                  className="no-underline"
                >
                  <motion.div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border"
                    style={{
                      background: isDark ? '#261845' : '#F5F0FF',
                      borderColor: isDark ? '#4C3580' : '#C4B5FD',
                      color: isDark ? '#C4B5FD' : '#7C3AED',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign in
                  </motion.div>
                </NavLink>
              )}
            </div>

            {/* Dark mode toggle */}
            <motion.button
              onClick={toggleDark}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full border transition-colors duration-200"
              style={{
                background: isDark ? '#261845' : '#F5F0FF',
                borderColor: isDark ? '#4C3580' : '#C4B5FD',
                color: isDark ? '#C4B5FD' : '#7C3AED',
              }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDark ? 'moon' : 'sun'}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* Mobile hamburger */}
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-2 rounded-full transition-colors"
              style={{
                background: menuOpen ? (isDark ? '#261845' : '#F5F0FF') : 'transparent',
                color: isDark ? '#C4B5FD' : '#6D28D9',
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu — animated */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden overflow-hidden border-t"
              style={{ borderColor: T.navBorder, background: T.navBg }}
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {/* Nav links */}
                {navLinks.map(({ to, label, icon: Icon, requiresAuth }, i) => (
                  <motion.div
                    key={to}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                  >
                    <NavLink
                      to={to}
                      end={to === '/'}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm no-underline font-semibold transition-all"
                      style={({ isActive }) => ({
                        background: isActive ? '#7C3AED' : isDark ? '#261845' : '#F5F0FF',
                        color: isActive ? 'white' : isDark ? '#C4B5FD' : '#6D28D9',
                        fontFamily: "'Nunito', sans-serif",
                        fontWeight: 700,
                      })}
                    >
                      <Icon size={18} />
                      {label}
                      {requiresAuth && !isSignedIn && (
                        <Lock size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                      )}
                    </NavLink>
                  </motion.div>
                ))}

                {/* Auth row */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.05, duration: 0.2 }}
                >
                  {isSignedIn && user ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: isDark ? '#261845' : '#F5F0FF' }}>
                      <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
                      <span style={{ color: isDark ? '#C4B5FD' : '#6D28D9', fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>
                        {user.name}
                      </span>
                      <button
                        onClick={() => { signOut(); setMenuOpen(false); }}
                        style={{ color: isDark ? '#9381CC' : '#9CA3AF', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <NavLink
                      to="/history"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm no-underline font-bold transition-all"
                      style={{
                        background: isDark ? '#261845' : '#F5F0FF',
                        color: isDark ? '#C4B5FD' : '#6D28D9',
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      <Lock size={18} />
                      Sign in with Google
                    </NavLink>
                  )}
                </motion.div>

                {/* Dark mode toggle in mobile menu */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navLinks.length + 1) * 0.05, duration: 0.2 }}
                >
                  <button
                    onClick={() => { toggleDark(); setMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold w-full transition-all"
                    style={{
                      background: isDark ? '#261845' : '#F5F0FF',
                      color: isDark ? '#C4B5FD' : '#6D28D9',
                      fontFamily: "'Nunito', sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
