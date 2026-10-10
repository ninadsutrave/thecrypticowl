import { Outlet, NavLink, useLocation } from 'react-router';
import {
  Menu,
  X,
  LayoutGrid,
  BarChart3,
  Info,
  Sun,
  Moon,
  Trophy,
  Lock,
  LogOut,
} from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useStreak } from '../hooks/useStreak';
import { currentStreak } from '../games/solveRecords';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// Off the critical path, but fetched once the page is idle: by the time the
// connection drops, the offline screen is already in memory.
const loadNoInternet = () => import('./NoInternet');
const NoInternet = lazy(() => loadNoInternet().then(mod => ({ default: mod.NoInternet })));
// The footer's like button (and the Supabase calls behind it) loads after
// first paint: it is below the fold on every screen.
const LikeButton = lazy(() =>
  import('../components/LikeButton').then(mod => ({ default: mod.LikeButton }))
);

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
  const [avatarDropdown, setAvatarDropdown] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const T = getTheme(isDark);
  const { refresh: refreshStreak } = useStreak();
  // Days in a row with any puzzle finished: the same streak as the home page.
  const [streak, setStreak] = useState(() => currentStreak());
  const { user, isSignedIn, signOut } = useAuth();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  // The dedicated offline screen owns /offline; everywhere else it takes over
  // the content area only while the browser reports no connection.
  const isOffline = !isOnline && location.pathname !== '/offline';

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Default tab title for every route. A layout effect runs before the
  // pages' own (passive) title effects, so pages that set one still win and
  // pages that don't no longer inherit the previous page's title.
  useLayoutEffect(() => {
    document.title = 'The Cryptic Owl · Daily Puzzles';
  }, [location.pathname]);

  // Close mobile menu, avatar dropdown, and refresh streak on route change
  useEffect(() => {
    setMenuOpen(false);
    setAvatarDropdown(false);
    refreshStreak();
    setStreak(currentStreak());
    // refreshStreak identity is stable across renders; location.pathname is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const warm = () => void loadNoInternet().catch(() => {});
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 3000);
    return () => clearTimeout(id);
  }, []);

  const navLinks = [
    { to: '/', label: 'Puzzles', icon: LayoutGrid, requiresAuth: false },
    // The cryptic tutorial lives on the cryptic card and puzzle page, not
    // here: every other game has its own walkthrough. One stats destination
    // too: the cryptic XP/archive page is linked from it.
    { to: '/stats', label: 'Stats', icon: BarChart3, requiresAuth: false },
    { to: '/about', label: 'About', icon: Info, requiresAuth: false },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: T.pageBg, fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ background: T.navBg, borderColor: T.navBorder }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
            <OwlLogoMini />
            <span
              className="whitespace-nowrap"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(1.1rem, 4vw, 1.25rem)',
                color: T.brandStrong,
                letterSpacing: '-0.01em',
              }}
            >
              TheCrypticOwl
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
                  color: isActive ? 'white' : T.brandText,
                  fontFamily: "'Nunito', sans-serif",
                })}
              >
                {label}
                {requiresAuth && !isSignedIn && <Lock size={11} style={{ opacity: 0.6 }} />}
              </NavLink>
            ))}
          </div>

          {/* Right: Streak + Auth + Dark toggle + Mobile menu */}
          <div className="flex items-center gap-2">
            {/* Streak */}
            {isSignedIn && (
              <m.div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border sm:px-3"
                style={{
                  background: T.streakBg,
                  borderColor: T.streakBorder,
                }}
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-sm sm:text-base">🔥</span>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.9rem',
                    color: T.streakText,
                  }}
                  className="sm:text-[1rem]"
                >
                  {streak}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: isDark ? '#C2410C' : '#C2410C',
                    fontWeight: 600,
                  }}
                  className="sm:text-[0.72rem]"
                >
                  streak
                </span>
              </m.div>
            )}

            {/* Auth: avatar dropdown or sign-in nudge */}
            <div className="hidden md:flex">
              {isSignedIn && user ? (
                <div className="relative" ref={avatarRef}>
                  <m.button
                    onClick={() => setAvatarDropdown(v => !v)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    title={user.name}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full block"
                      style={{ border: `2px solid ${T.brandBorder}` }}
                    />
                  </m.button>

                  <AnimatePresence>
                    {avatarDropdown && (
                      <m.div
                        initial={{ opacity: 0, scale: 0.92, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl overflow-hidden z-50"
                        style={{ background: T.cardBg, borderColor: T.cardBorder }}
                      >
                        <div className="px-4 py-3 border-b" style={{ borderColor: T.cardBorder }}>
                          <p
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: T.text,
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.name}
                          </p>
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: T.textMuted,
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.email}
                          </p>
                        </div>
                        <NavLink
                          to="/history"
                          onClick={() => setAvatarDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm no-underline font-semibold transition-colors hover:opacity-80"
                          style={{
                            color: T.brandStrong,
                            fontFamily: "'Nunito', sans-serif",
                          }}
                        >
                          <Trophy size={14} /> My Progress
                        </NavLink>
                        <button
                          onClick={() => {
                            setAvatarDropdown(false);
                            signOut();
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold border-t transition-colors hover:opacity-80"
                          style={{
                            color: '#EF4444',
                            borderColor: T.cardBorder,
                            background: 'none',
                            fontFamily: "'Nunito', sans-serif",
                            cursor: 'pointer',
                          }}
                        >
                          <LogOut size={14} /> Sign out
                        </button>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <NavLink to="/history" className="no-underline">
                  <m.div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border"
                    style={{
                      background: T.brandSurface,
                      borderColor: T.brandBorder,
                      color: T.brandText,
                      fontFamily: "'Nunito', sans-serif",
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign in
                  </m.div>
                </NavLink>
              )}
            </div>

            {/* Dark mode toggle */}
            <m.button
              onClick={toggleDark}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full border transition-colors duration-200"
              style={{
                background: T.brandSurface,
                borderColor: T.brandBorder,
                color: T.brandText,
              }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={isDark ? 'moon' : 'sun'}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </m.span>
              </AnimatePresence>
            </m.button>

            {/* Mobile hamburger */}
            <m.button
              onClick={() => setMenuOpen(!menuOpen)}
              whileTap={{ scale: 0.9 }}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              className="md:hidden p-2 rounded-full transition-colors"
              style={{
                background: menuOpen ? T.brandSurface : 'transparent',
                color: T.brandText,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.span
                  key={menuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </m.span>
              </AnimatePresence>
            </m.button>
          </div>
        </div>

        {/* Mobile Menu — animated */}
        <AnimatePresence>
          {menuOpen && (
            <m.div
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
                  <m.div
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
                        background: isActive ? '#7C3AED' : T.brandSurface,
                        color: isActive ? 'white' : T.brandText,
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
                  </m.div>
                ))}

                {/* Auth row */}
                <m.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.05, duration: 0.2 }}
                >
                  {isSignedIn && user ? (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                      style={{ background: T.brandSurface }}
                    >
                      <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
                      <span
                        style={{
                          color: T.brandText,
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          flex: 1,
                        }}
                      >
                        {user.name}
                      </span>
                      <button
                        onClick={() => {
                          signOut();
                          setMenuOpen(false);
                        }}
                        style={{
                          color: T.faintText,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
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
                        background: T.brandSurface,
                        color: T.brandText,
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      <Lock size={18} />
                      Sign in with Google
                    </NavLink>
                  )}
                </m.div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </nav>

      {/* The nav and footer stay put so the solver is never stranded on a
          dead screen — only the content area is replaced. */}
      <main className="flex-grow">
        {isOffline ? (
          <Suspense fallback={null}>
            <NoInternet />
          </Suspense>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-auto border-t py-8"
        style={{ background: T.navBg, borderColor: T.navBorder }}
      >
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div
            style={{
              fontSize: '0.9rem',
              color: T.textMuted,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Copyright © {new Date().getFullYear()}{' '}
            <a
              href="https://ninadsutrave.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline"
              style={{ color: T.brand }}
            >
              Ninad Sutrave
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <NavLink
              to="/about#suggest"
              className="text-sm font-semibold hover:underline no-underline"
              style={{ color: T.brand }}
            >
              Suggest a puzzle
            </NavLink>
            <NavLink
              to="/privacy"
              className="text-sm font-semibold hover:underline no-underline"
              style={{ color: T.brand }}
            >
              Privacy Policy
            </NavLink>
            <Suspense
              fallback={
                <span className="inline-block w-[104px] h-[30px] rounded-full" aria-hidden />
              }
            >
              <LikeButton isDark={isDark} />
            </Suspense>
          </div>
        </div>
      </footer>
    </div>
  );
}
