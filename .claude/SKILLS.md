# CrypticOwl — LLM Contributor Guide

A daily cryptic crossword learning app. One clue per day, gamified with streaks, XP, and levels. Pure client-side React — no backend.

---

## Stack

| Layer | Tool |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 + inline `style` props (see Styling section) |
| Animation | `motion/react` (Framer Motion v12) |
| Components | Radix UI primitives + shadcn/ui wrappers in `src/app/components/ui/` |
| Icons | Lucide React |
| Persistence | `localStorage` only — no backend, no auth |
| Fonts | Fredoka One (headings), Nunito (body) — loaded via Google Fonts |

---

## Project Structure

```
src/app/
  App.tsx                  # Root: DarkModeProvider wraps RouterProvider
  routes.tsx               # Route config: Root > { Home, Learn, Puzzle }
  theme.ts                 # LIGHT + DARK color token objects + getTheme()
  context/
    DarkModeContext.tsx     # isDark state + toggle(), persisted to localStorage
  hooks/
    useStreak.ts            # XP / streak / level logic, persisted to localStorage
  pages/
    Root.tsx                # Layout: sticky nav, dark toggle, mobile menu, <Outlet />
    Home.tsx                # Landing: hero, stats strip, wordplay preview, achievements
    Learn.tsx               # Guide: 5 sections — Intro, Parts, Wordplay, Indicators, Synonyms
    Puzzle.tsx              # Daily puzzle: clue, answer grid, hints, confetti, share
  components/
    Mascot.tsx              # Ollie the Owl — SVG mascot with mood states
    ui/                     # 48 Radix UI / shadcn components (button, tabs, dialog, ...)
```

---

## Routing

```
/           → Home.tsx
/learn      → Learn.tsx
/puzzle     → Puzzle.tsx
```

Routes are defined in `routes.tsx` as a `createBrowserRouter` config. `Root.tsx` is the layout wrapper — it renders the navbar and an `<Outlet />`. All pages are children of `Root`.

To add a new page:
1. Create `src/app/pages/MyPage.tsx`
2. Add it to `routes.tsx` as a child of `Root`
3. Add a nav link in `Root.tsx`

---

## Styling — Critical Rules

**This codebase does NOT use Tailwind color classes.** All colors come from the theme system via inline `style` props.

### What Tailwind is used for
Layout only: `flex`, `grid`, `gap-*`, `p-*`, `mx-auto`, `max-w-*`, `md:hidden`, `overflow-hidden`, `hide-scrollbar`.

### What inline styles are used for
Everything color/typography related:
```tsx
style={{ background: T.cardBg, borderColor: T.cardBorder, color: T.text }}
style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem' }}
style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white' }}
```

### The theme pattern — use this every time
```tsx
const { isDark } = useDarkMode();
const T = getTheme(isDark);   // T is the full theme object

// Then reference tokens:
style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
```

### Available theme tokens
```
T.pageBg          T.navBg           T.navBorder
T.cardBg          T.cardBorder      T.cardBorderStrong
T.text            T.textSub         T.textMuted         T.textFaint
T.inputBg         T.inputBorder
T.clueBg          T.clueAreaBorder
T.hintAreaBg      T.shareCardBg     T.shareCardBorder
T.stickyNavBg     T.mobileBarBg
T.tableRowHover   T.tableHeaderBg   T.tableRowBorder
T.successBg       T.successBorder
T.wrongBg         T.wrongBorder
T.streakBg        T.streakBorder
```

### When no token fits — use isDark ternary
```tsx
style={{ color: isDark ? '#C4B5FD' : '#1E1B4B' }}
```

### Brand color palette
```
Purple:           #7C3AED (primary CTA)    #5B21B6 (gradient end)   #C4B5FD (light text)
Blue (info):      #3B82F6 border           #EFF6FF bg-light          #0D1F35 bg-dark
Green (success):  #10B981 border           #ECFDF5 bg-light          #062010 bg-dark
Red (error):      #FCA5A5 border           #FFF1F2 bg-light          #2A0F15 bg-dark
Orange (fodder):  #F97316 border           #FFF7ED bg-light          #2A1505 bg-dark
```

### Fonts
- **Fredoka One** — headings, display numbers, badges: `fontFamily: "'Fredoka One', cursive"`
- **Nunito** — body, buttons, inputs: `fontFamily: "'Nunito', sans-serif"` with `fontWeight: 600|700|800`
- Responsive text: `fontSize: 'clamp(1rem, 3vw, 1.4rem)'`

---

## Dark Mode

```tsx
import { useDarkMode } from '../context/DarkModeContext';

const { isDark, toggle } = useDarkMode();
```

- Persisted to `localStorage` key `'tco-dark'`
- Defaults to system preference (`prefers-color-scheme: dark`)
- Sets `document.documentElement.classList` (`dark` class) as a side effect
- **Every component that renders colors must consume `isDark`**

---

## Animation — Motion Patterns

Import: `import { motion, AnimatePresence } from 'motion/react';`

### Fade in on mount
```tsx
<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
```

### Hover + tap feedback (buttons)
```tsx
<motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
```

### Animated mount/unmount (requires AnimatePresence wrapper)
```tsx
<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    />
  )}
</AnimatePresence>
```

### Staggered list items
```tsx
{items.map((item, i) => (
  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
```

### Floating idle animation
```tsx
<motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
```

### Scroll-triggered (one-time)
```tsx
<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
```

### Icon swap
```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.span key={isDark ? 'dark' : 'light'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
```

---

## Mascot Component

```tsx
import { Mascot, type MascotMood } from '../components/Mascot';

<Mascot
  mood="thinking"           // 'default' | 'thinking' | 'celebrating' | 'hint' | 'wrong' | 'correct'
  size={120}                // px, default 100
  speechBubble="Hello!"     // optional text bubble
  bubbleDirection="right"   // 'left' | 'right', default 'right'
  animate={true}            // floating animation, default true
/>
```

| Mood | When to use |
|---|---|
| `default` | Idle, page load |
| `thinking` | User hasn't interacted yet |
| `hint` | User requested a hint |
| `wrong` | Incorrect answer submitted |
| `celebrating` / `correct` | Correct answer, success |

---

## useStreak Hook

```tsx
import { useStreak, getLevelTitle, getXPToNextLevel } from '../hooks/useStreak';

const { count, totalSolved, xp, level, bestStreak, recordSolve } = useStreak();
```

| Field | Description |
|---|---|
| `count` | Current daily streak |
| `totalSolved` | Lifetime puzzles completed |
| `xp` | Total XP earned |
| `level` | Current level (computed from XP) |
| `bestStreak` | All-time highest streak |
| `recordSolve(hintsUsed)` | Call when user solves a puzzle |

**XP per solve:** 0 hints → 100, 1 → 75, 2 → 50, 3 → 25, 4+ → 10

**Level formula:** `Math.floor(Math.sqrt(xp / 50)) + 1`

**Level titles:** Newbie Cryptician (1) → Apprentice Solver (2) → Clue Hunter (3-4) → Word Wizard (5-6) → Cryptic Expert (7-9) → Grand Master (10+)

**localStorage key:** `'tco-streak'` — serialized `StreakData` JSON

---

## Puzzle Data Shape

The current puzzle is a hardcoded constant in `Puzzle.tsx`. To add new puzzles, follow this shape:

```ts
const PUZZLE = {
  number: 42,
  clue: 'Pears mixed up to form a weapon (5)',
  answer: 'SPEAR',
  letterCount: 5,
  hints: [
    {
      id: 1,
      title: 'Definition Location',
      text: '...',
      highlight: 'a weapon',           // substring of clue to visually highlight
      mascotComment: '...',
      color: '#3B82F6',
      bg: '#EFF6FF', bgDark: '#0D1F35', border: '#93C5FD',
    },
    // up to 4 hints
  ],
};
```

Clue parts (for color-coded display):
```ts
const CLUE_PARTS = [
  { text: 'Pears',      type: 'fodder' },      // orange
  { text: ' mixed up ', type: 'indicator' },   // purple
  { text: 'to form ',   type: null },
  { text: 'a weapon',   type: 'definition' },  // blue
  { text: ' (5)',        type: null },
];
```

Part color tokens live in `PART_STYLES` in `Puzzle.tsx`:
- `definition` → blue
- `indicator` → purple
- `fodder` → orange
- `wordplay` → green

---

## localStorage Keys

| Key | Type | Description |
|---|---|---|
| `'tco-dark'` | `'true' \| 'false'` | Dark mode preference |
| `'tco-streak'` | JSON `StreakData` | XP, level, streak counts |

---

## UI Components

48 Radix UI / shadcn components in `src/app/components/ui/`. Key ones:

```tsx
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
```

Or use Radix primitives directly (as the pages do):
```tsx
import * as Tabs from '@radix-ui/react-tabs';
import * as Accordion from '@radix-ui/react-accordion';
```

Toasts via Sonner: `import { toast } from 'sonner';`

---

## Component Conventions

- **Always function components** — no class components
- **Named exports:** `export function PageName() {}`
- **Props inline:** `function Comp({ isDark }: { isDark: boolean }) {}`
- **No Redux / Zustand** — state lives in hooks + context + useState
- **Confetti:** `import confetti from 'canvas-confetti'; confetti({ ... })` — only in Puzzle.tsx success state

---

## Adding a New Page — Checklist

1. Create `src/app/pages/MyPage.tsx`
2. Start with:
   ```tsx
   import { useDarkMode } from '../context/DarkModeContext';
   import { getTheme } from '../theme';

   export function MyPage() {
     const { isDark } = useDarkMode();
     const T = getTheme(isDark);

     return (
       <main style={{ background: T.pageBg, color: T.text, minHeight: '100vh' }}>
         {/* content */}
       </main>
     );
   }
   ```
3. Register in `routes.tsx`
4. Add nav link in `Root.tsx`

---

## Common Gotchas

- `motion/react` not `framer-motion` — the import path matters
- `AnimatePresence` must wrap conditional renders for exit animations to fire
- Dark mode requires `isDark` prop drilling into any sub-component that renders colors — there is no CSS variable fallback
- The `T.pageBg` token is a CSS gradient string, not a plain color — use `background:` not `backgroundColor:`
- `hide-scrollbar` utility class is defined in `src/styles/tailwind.css`, not a standard Tailwind class
- Dev server: requires nvm — `source ~/.nvm/nvm.sh && nvm use 20 && npm run dev`
