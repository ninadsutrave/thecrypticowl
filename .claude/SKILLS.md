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

## Auth System (Google OAuth)

**Library:** `@react-oauth/google`

**Env var:** `VITE_GOOGLE_CLIENT_ID` — must be set in `.env` (see `.env.example`). If missing, the History page shows a dev warning instead of the Google button.

**Provider setup in `App.tsx`:**
```tsx
<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
  <DarkModeProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </DarkModeProvider>
</GoogleOAuthProvider>
```

**Consuming auth:**
```tsx
import { useAuth } from '../context/AuthContext';

const { user, signIn, signOut, isSignedIn } = useAuth();
// user: { name, email, picture, sub } | null
```

**Rendering the Google sign-in button:**
```tsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(response) => {
    if (response.credential) signIn(response.credential);
  }}
  onError={() => {}}
  theme={isDark ? 'filled_black' : 'outline'}
  shape="pill"
/>
```

**Auth flow:** `GoogleLogin` returns a JWT credential → `signIn()` decodes the payload with `atob()` → stores `GoogleUser` in `localStorage` key `'tco-user'`. No backend involved.

**Gating content behind auth:**
```tsx
const { isSignedIn } = useAuth();
if (!isSignedIn) return <SignInGate isDark={isDark} />;
// ... authenticated content
```

**What requires auth:** History page (`/history`) — past puzzle archive + personal solve history + stats. Everything else (Home, Learn, Puzzle) is free without sign-in.

**Nav behaviour:** History link shows a `<Lock />` icon when not signed in. Desktop nav shows user avatar (links to `/history`) when signed in, or a "Sign in" pill button. Mobile menu shows sign-out row when signed in.

---

## localStorage Keys

| Key | Type | Description |
|---|---|---|
| `'tco-dark'` | `'true' \| 'false'` | Dark mode preference (defaults to `false` = light) |
| `'tco-streak'` | JSON `StreakData` | XP, level, streak counts + solve history array |
| `'tco-user'` | JSON `GoogleUser` | Signed-in user profile (name, email, picture, sub) |

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

## UI, Design & UX Patterns

This section captures the visual language and UX conventions of the app. Follow these when adding any new UI — consistency matters more than personal preference.

### Visual Identity

The app has a warm, playful-but-smart personality — like a friendly professor owl. Every design decision should reinforce that: approachable, satisfying, never sterile.

| Element | Rule |
|---|---|
| **Tone** | Encouraging, never intimidating. Cryptic crosswords are hard — the UI should make users feel capable |
| **Mascot** | Ollie the Owl appears on key moments (first load, hints, success, errors). Always use him with a relevant `mood` and a `speechBubble` |
| **Colour** | Purple-led palette. Green = success. Orange = streak/energy. Red = wrong. Blue = information |
| **Spacing** | Generous. Cards have `p-5` or `p-6`. Sections breathe with `py-12` or `py-16` |
| **Borders** | Always rounded — `rounded-2xl` (components), `rounded-3xl` (cards/sections). No sharp corners anywhere |

---

### Card Pattern

Every content block is a card. Cards follow this exact template:

```tsx
<div
  className="rounded-3xl border p-6"
  style={{
    background: T.cardBg,
    borderColor: T.cardBorder,
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.3)'
      : '0 4px 24px rgba(124,58,237,0.07)',
  }}
>
```

- Light shadow in light mode uses the brand purple tint (`rgba(124,58,237,...)`)
- Dark shadow is plain black with moderate opacity
- Never use `box-shadow` with a hard offset — always soft diffuse shadows
- Inner sections within a card use `rounded-2xl` (one step smaller)

---

### Typography Hierarchy

| Role | Font | Weight | Size |
|---|---|---|---|
| Page title / hero | Fredoka One | 400 (single weight) | `clamp(1.8rem, 4vw, 2.6rem)` |
| Section heading | Fredoka One | 400 | `1.2rem – 1.5rem` |
| Card title | Fredoka One | 400 | `1rem – 1.2rem` |
| Stat / number display | Fredoka One | 400 | `1.5rem – 2rem` |
| Body text | Nunito | 600 | `0.9rem – 1rem` |
| Caption / meta | Nunito | 600 | `0.75rem – 0.83rem` |
| Button label | Nunito | 700–800 | `0.85rem – 1rem` |
| Badge / pill | Nunito | 700 | `0.72rem – 0.83rem` |

**Rules:**
- Fredoka One is purely decorative — never use it for interactive labels or body copy
- Nunito `fontWeight: 600` is the minimum — never use 400 or 500 in UI elements
- Use `clamp()` for any text above `1rem` that appears in a hero or section header
- Emoji in headings is fine and encouraged (e.g. `Your Achievements 🦉`)

---

### Button Styles

There are three button variants in this app. Do not invent new ones.

**Primary CTA — gradient purple:**
```tsx
<motion.button
  whileHover={{ scale: 1.04, y: -2 }}
  whileTap={{ scale: 0.97 }}
  style={{
    background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
    color: 'white',
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 800,
    fontSize: '1rem',
    padding: '0.75rem 2rem',
    borderRadius: '9999px',
    border: 'none',
  }}
>
  Start Solving
</motion.button>
```

**Secondary — ghost with border:**
```tsx
<motion.button
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.97 }}
  style={{
    background: isDark ? '#261845' : '#F5F0FF',
    color: isDark ? '#C4B5FD' : '#7C3AED',
    border: `1px solid ${isDark ? '#4C3580' : '#C4B5FD'}`,
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 700,
    borderRadius: '9999px',
    padding: '0.6rem 1.5rem',
  }}
>
  Learn More
</motion.button>
```

**Destructive / muted — text-only feel:**
```tsx
<button
  style={{
    color: isDark ? '#9381CC' : '#6B7280',
    fontWeight: 600,
    fontSize: '0.83rem',
    background: 'transparent',
    border: 'none',
  }}
>
  Sign out
</button>
```

**Rules:**
- All interactive elements use `motion.button` with `whileHover` + `whileTap`
- `whileHover={{ scale: 1.04–1.1, y: -2 }}` for lift, `whileTap={{ scale: 0.95–0.97 }}` for press
- Never use `cursor: pointer` manually — it's inherited from `button`
- Pill shape (`borderRadius: '9999px'`) for all standalone buttons
- `rounded-2xl` only for buttons embedded inside cards/grids

---

### Badge / Pill Pattern

Used for level titles, wordplay types, hint labels, status tags:

```tsx
<span
  className="px-3 py-0.5 rounded-full text-sm font-bold"
  style={{
    background: isDark ? '#261845' : '#F5F0FF',
    color: isDark ? '#C4B5FD' : '#7C3AED',
    border: `1px solid ${isDark ? '#4C3580' : '#C4B5FD'}`,
  }}
>
  Word Wizard 🧙
</span>
```

For coloured status badges (hints, achievements):
```tsx
<span
  className="px-2 py-0.5 rounded-full text-xs font-bold"
  style={{
    background: isDark ? '#062010' : '#ECFDF5',
    color: '#10B981',
    border: '1px solid #10B98140',  // 25% opacity border
  }}
>
  No hints
</span>
```

---

### Icon Usage

Icons come from **Lucide React** exclusively. Size conventions:

| Context | Size |
|---|---|
| Inside body text / inline | `14` |
| Card icon accent | `18–20` |
| Nav links | `18` |
| Section header accent | `22–24` |
| Hero / large decorative | `28–32` |

Always pass `style={{ color: '...' }}` — never use Tailwind `text-*` classes on icons.

```tsx
import { Trophy, Zap, Flame } from 'lucide-react';

<Trophy size={22} style={{ color: '#D97706' }} />
```

---

### Colour Usage by Semantic Role

Never use raw hex values for colours that have a semantic role. Reference the theme or the palette constants below:

| Meaning | Light bg | Dark bg | Border / text |
|---|---|---|---|
| Brand / primary | `#F5F0FF` | `#261845` | `#7C3AED` / `#C4B5FD` |
| Success | `#ECFDF5` | `#062010` | `#10B981` |
| Error / wrong | `#FFF1F2` | `#2A0F15` | `#FCA5A5` / `#EF4444` |
| Warning / streak | `#FFF7ED` | `#2A1505` | `#F97316` / `#FB923C` |
| Info / definition | `#EFF6FF` | `#0D1F35` | `#3B82F6` / `#93C5FD` |
| Indicator / purple | `#F5F3FF` | `#1A0F35` | `#7C3AED` / `#A78BFA` |

Use `40` hex suffix for 25% opacity borders: `#10B98140`

---

### Spacing & Layout

- **Max content width:** `max-w-2xl` (672px) for single-column content, `max-w-5xl` (1024px) for nav
- **Page padding:** `px-4` on mobile, auto-centered with `mx-auto`
- **Section vertical rhythm:** `py-12` between major sections, `mb-6` between sub-sections
- **Card gap in grids:** `gap-3` for tight grids, `gap-4` for looser layouts
- **Internal card padding:** `p-4` (compact), `p-5` or `p-6` (standard)

Grid patterns used:
```tsx
className="grid grid-cols-2 sm:grid-cols-4 gap-3"   // stat grids
className="grid grid-cols-1 sm:grid-cols-2 gap-4"   // card grids
```

---

### Animation Principles

Animations serve feedback — they communicate state, not decoration. Follow these rules:

| Action | Animation |
|---|---|
| Page / section mount | `opacity: 0 → 1`, `y: 16 → 0`, `duration: 0.3–0.5` |
| List items (staggered) | `delay: i * 0.05–0.07`, `x: -16 → 0` |
| Card hover | `whileHover={{ y: -2, scale: 1.02 }}` — subtle lift |
| Button press | `whileTap={{ scale: 0.95–0.97 }}` |
| Success moment | Spring + confetti. `type: 'spring', stiffness: 400, damping: 24` |
| Idle mascot | `y: [0, -4, 0]`, `duration: 3`, `repeat: Infinity` — gentle float |
| Enter/exit panels | `height: 0 → auto` with `ease: [0.4, 0, 0.2, 1]` |

**Never:** animate colors with Motion (use CSS `transition-colors`). Never use `duration > 0.6s` for UI feedback. Never animate layout-shifting properties like `width` on interactive elements.

---

### Empty States

Every list or data section must have an empty state — never render nothing:

```tsx
{history.length === 0 && (
  <div
    className="rounded-2xl border p-8 text-center"
    style={{ background: T.cardBg, borderColor: T.cardBorder }}
  >
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧩</div>
    <p style={{ color: T.textMuted, fontSize: '0.9rem' }}>
      No solves yet — go crack <a href="/puzzle" ...>today's puzzle</a>!
    </p>
  </div>
)}
```

Pattern: large emoji → short friendly message → optional action link.

---

### Gated / Auth-Required UI

When content requires sign-in, show a `SignInGate` — never hide the section silently:

- Centre a card with the mascot (`mood="thinking"`)
- Explain the value clearly (bullet list of what they'll unlock)
- Show the Google sign-in button
- Add a reassurance line: *"Free features don't require sign-in"*

---

### Mobile Considerations

- All pages scroll vertically — no horizontal scroll except for tab bars (use `hide-scrollbar`)
- Sticky input at bottom of Puzzle page uses `md:hidden` + `fixed bottom-0`
- Touch targets minimum `44px` height — use `py-3` on nav items
- Test that `AnimatePresence` exit animations don't cause layout shifts on mobile
- Nav links in mobile menu use full-width `flex` rows, not inline pills

---

## Common Gotchas

- `motion/react` not `framer-motion` — the import path matters
- `AnimatePresence` must wrap conditional renders for exit animations to fire
- Dark mode requires `isDark` prop drilling into any sub-component that renders colors — there is no CSS variable fallback
- The `T.pageBg` token is a CSS gradient string, not a plain color — use `background:` not `backgroundColor:`
- `hide-scrollbar` utility class is defined in `src/styles/tailwind.css`, not a standard Tailwind class
- Dev server: requires nvm — `source ~/.nvm/nvm.sh && nvm use 20 && npm run dev`
