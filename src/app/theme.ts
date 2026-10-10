export const LIGHT = {
  pageBg: 'linear-gradient(135deg, #F5F0FF 0%, #FFF8F5 40%, #F0FDF9 100%)',
  navBg: 'rgba(255,255,255,0.88)',
  navBorder: '#EDE9FE',
  cardBg: 'white',
  cardBorder: '#EDE9FE',
  cardBorderStrong: '#C4B5FD',
  text: '#1E1B4B',
  textSub: '#4B5563',
  textMuted: '#6B7280',
  // Previous #9CA3AF on white was ~2.6:1 — fails WCAG AA. #6B7280 hits 4.8:1.
  textFaint: '#6B7280',
  inputBg: '#F9F7FF',
  inputBorder: '#E0E7FF',
  clueBg: 'linear-gradient(135deg, #F9F7FF, #F0F9FF)',
  clueAreaBorder: '#E0E7FF',
  hintAreaBg: 'rgba(255,255,255,0.7)',
  shareCardBg: '#F9F7FF',
  shareCardBorder: '#C4B5FD',
  stickyNavBg: 'rgba(245,240,255,0.94)',
  tableRowHover: '#F9F7FF',
  tableHeaderBg: '#F9F7FF',
  tableRowBorder: '#F3F4F6',
  successBg: '#ECFDF5',
  successBorder: '#6EE7B7',
  wrongBg: '#FFF1F2',
  wrongBorder: '#FCA5A5',
  streakBg: '#FFF7ED',
  streakBorder: '#FED7AA',
  mobileBarBg: 'rgba(255,255,255,0.97)',

  // ── Brand ──────────────────────────────────────────────────────────────────
  // The violet ramp, named by role rather than by hex. These eight tokens
  // replaced ~345 literal occurrences across the pages; a literal is now a
  // signal that a colour is genuinely one-off rather than part of the system.
  brand: '#7C3AED', // primary action / accent
  brandStrong: '#5B21B6', // headings, pressed states
  brandSoft: '#C4B5FD', // borders, muted accent text
  brandSurface: '#F5F0FF', // tinted panels and chips
  brandBorder: '#C4B5FD', // outline on tinted panels
  brandText: '#6D28D9', // accent text on a light ground
  heading: '#1E1B4B', // primary heading ink
  onBrand: '#FFFFFF', // text on a filled brand surface

  // ── Clue anatomy ───────────────────────────────────────────────────────────
  // The colour system the hints and the breakdown actually teach with:
  // definition = blue, indicator = purple, fodder = orange.
  definitionBg: '#EFF6FF',
  indicatorBg: '#F5F3FF',
  fodderBg: '#FFF7ED',
  definitionText: '#1D4ED8',
  indicatorText: '#5B21B6',
  fodderText: '#C2410C',
  streakText: '#C2410C',
  bodyText: '#374151',
  faintText: '#6B7280',

  // ── Elevation & speech bubble ──────────────────────────────────────────────
  shadowCard: '0 1px 2px rgba(30,27,75,0.06), 0 10px 28px -16px rgba(76,29,149,0.28)',
  shadowCardHover: '0 2px 4px rgba(30,27,75,0.08), 0 18px 36px -16px rgba(76,29,149,0.38)',
  bubbleBg: '#FFFFFF',
  bubbleBorder: '#C4B5FD',
  bubbleText: '#4C1D95',
};

export const DARK = {
  pageBg: 'linear-gradient(135deg, #111016 0%, #17161F 50%, #101215 100%)',
  navBg: 'rgba(17,16,22,0.94)',
  navBorder: '#2F2C3D',
  cardBg: '#1C1B24',
  cardBorder: '#393547',
  cardBorderStrong: '#5D5680',
  text: '#F0EAFF',
  textSub: '#C4B5FD',
  textMuted: '#A9A3BD',
  // Previous #6D5FA8 on dark bg dipped below 4.5:1. Lighter purple passes AA comfortably.
  textFaint: '#A78BFA',
  inputBg: '#26242F',
  inputBorder: '#4A4560',
  clueBg: 'linear-gradient(135deg, #26242F, #1A1D26)',
  clueAreaBorder: '#4A4560',
  hintAreaBg: 'rgba(28,27,36,0.8)',
  shareCardBg: '#26242F',
  shareCardBorder: '#4A4560',
  stickyNavBg: 'rgba(17,16,22,0.96)',
  tableRowHover: '#26242F',
  tableHeaderBg: '#26242F',
  tableRowBorder: '#2F2C3D',
  successBg: '#0A2520',
  successBorder: '#10B981',
  wrongBg: '#2A0F15',
  wrongBorder: '#F87171',
  streakBg: '#2A1A08',
  streakBorder: '#92400E',
  mobileBarBg: 'rgba(17,16,22,0.97)',

  // ── Brand (dark) ───────────────────────────────────────────────────────────
  brand: '#A78BFA',
  brandStrong: '#C4B5FD',
  brandSoft: '#C4B5FD',
  brandSurface: '#26242F',
  brandBorder: '#4A4560',
  brandText: '#C4B5FD',
  heading: '#F0EAFF',
  onBrand: '#FFFFFF',

  // ── Clue anatomy (dark) ────────────────────────────────────────────────────
  definitionBg: '#0D1F35',
  indicatorBg: '#1D1B26',
  fodderBg: '#2A1505',
  // Light shades on the dark tints: the light theme's inks were ~2:1 here.
  definitionText: '#93C5FD',
  indicatorText: '#C4B5FD',
  fodderText: '#FDBA74',
  streakText: '#FDBA74',
  bodyText: '#D7D3E3',
  faintText: '#A9A3BD',

  // ── Elevation & speech bubble (dark) ───────────────────────────────────────
  // Shadows barely read on a dark ground; a hairline top highlight does the
  // lifting instead.
  shadowCard: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 30px -18px rgba(0,0,0,0.8)',
  shadowCardHover: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 40px -18px rgba(0,0,0,0.9)',
  bubbleBg: '#2A2736',
  bubbleBorder: '#5D5680',
  bubbleText: '#EDE9FE',
};

export type Theme = typeof LIGHT;

export function getTheme(isDark: boolean): Theme {
  return isDark ? DARK : LIGHT;
}
