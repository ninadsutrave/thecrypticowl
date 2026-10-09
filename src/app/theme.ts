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
  pageBg: 'linear-gradient(135deg, #0D0820 0%, #180F38 50%, #08151F 100%)',
  navBg: 'rgba(13,8,32,0.94)',
  navBorder: '#2D1B69',
  cardBg: '#1A1035',
  cardBorder: '#3D2A6B',
  cardBorderStrong: '#5C3D9A',
  text: '#F0EAFF',
  textSub: '#C4B5FD',
  textMuted: '#A496D8',
  // Previous #6D5FA8 on dark bg dipped below 4.5:1. Lighter purple passes AA comfortably.
  textFaint: '#A78BFA',
  inputBg: '#261845',
  inputBorder: '#4C3580',
  clueBg: 'linear-gradient(135deg, #261845, #162038)',
  clueAreaBorder: '#4C3580',
  hintAreaBg: 'rgba(26,16,53,0.8)',
  shareCardBg: '#261845',
  shareCardBorder: '#4C3580',
  stickyNavBg: 'rgba(13,8,32,0.96)',
  tableRowHover: '#261845',
  tableHeaderBg: '#261845',
  tableRowBorder: '#2D1B69',
  successBg: '#0A2520',
  successBorder: '#10B981',
  wrongBg: '#2A0F15',
  wrongBorder: '#F87171',
  streakBg: '#2A1A08',
  streakBorder: '#92400E',
  mobileBarBg: 'rgba(13,8,32,0.97)',

  // ── Brand (dark) ───────────────────────────────────────────────────────────
  brand: '#A78BFA',
  brandStrong: '#C4B5FD',
  brandSoft: '#C4B5FD',
  brandSurface: '#261845',
  brandBorder: '#4C3580',
  brandText: '#C4B5FD',
  heading: '#F0EAFF',
  onBrand: '#FFFFFF',

  // ── Clue anatomy (dark) ────────────────────────────────────────────────────
  definitionBg: '#0D1F35',
  indicatorBg: '#1A0F35',
  fodderBg: '#2A1505',
  // Light shades on the dark tints: the light theme's inks were ~2:1 here.
  definitionText: '#93C5FD',
  indicatorText: '#C4B5FD',
  fodderText: '#FDBA74',
  streakText: '#FDBA74',
  bodyText: '#D6CCF5',
  faintText: '#A496D8',

  // ── Elevation & speech bubble (dark) ───────────────────────────────────────
  // Shadows barely read on a dark ground; a hairline top highlight does the
  // lifting instead.
  shadowCard: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 30px -18px rgba(0,0,0,0.8)',
  shadowCardHover: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 40px -18px rgba(0,0,0,0.9)',
  bubbleBg: '#2A1B52',
  bubbleBorder: '#5C3D9A',
  bubbleText: '#EDE9FE',
};

export type Theme = typeof LIGHT;

export function getTheme(isDark: boolean): Theme {
  return isDark ? DARK : LIGHT;
}
