# CrypticOwl — LLM Contributor Guide

A daily cryptic crossword learning app. One clue per day, gamified with streaks, XP, and levels. React frontend backed by Supabase (Postgres + Auth).

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
| Backend | Supabase (Postgres + Google OAuth) |
| Persistence | `localStorage` (primary, always works offline) + Supabase (sync when authenticated) |
| Fonts | Fredoka One (headings), Nunito (body) — loaded via Google Fonts |

---

## Project Structure

```
src/
  lib/
    supabase.ts              # Supabase client, all DB types, all helper functions
  app/
    App.tsx                  # Root: DarkModeProvider + AuthProvider wrap RouterProvider
    routes.tsx               # Route config: Root > { Home, Learn, Puzzle, Puzzle/:number, History }
    theme.ts                 # LIGHT + DARK color token objects + getTheme()
    context/
      DarkModeContext.tsx    # isDark state + toggle(), persisted to localStorage
      AuthContext.tsx        # Google OAuth session, user object, signIn/signOut
    hooks/
      useStreak.ts           # XP / streak / level logic — localStorage + Supabase sync
      useClueReaction.ts     # Like/dislike reaction state — localStorage + Supabase sync
    pages/
      Root.tsx               # Layout: sticky nav, dark toggle, mobile menu, streak, auth, <Outlet />
      Home.tsx               # Landing: hero (dynamic puzzle), stats strip, wordplay preview
      Learn.tsx              # Guide: 5 sections — Intro, Parts, Wordplay, Indicators, Synonyms
      Puzzle.tsx             # Daily puzzle: clue, answer grid, hints, confetti, share, success screen
      History.tsx            # Auth-gated: solve history, stats, puzzle archive
    components/
      Mascot.tsx             # Ollie the Owl — SVG mascot with mood states
      ui/                    # 48 Radix UI / shadcn components (button, tabs, dialog, ...)

supabase/
  migrations/
    001_initial.sql          # Single migration file — full schema, seed data, RLS, functions
```

---

## Routing

```
/               → Home.tsx
/learn          → Learn.tsx
/puzzle         → Puzzle.tsx          (today's puzzle)
/puzzle/:number → Puzzle.tsx          (archive view — shows stub if not the hardcoded puzzle)
/history        → History.tsx         (requires sign-in)
```

Routes are defined in `routes.tsx` as a `createBrowserRouter` config. `Root.tsx` is the layout wrapper — renders navbar and `<Outlet />`. All pages are children of `Root`.

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

## Database Schema

Migration file: `supabase/migrations/001_initial.sql` — run via `supabase db push` or paste into the SQL editor. **Single file — do not split.**

### Tables

| Table | Purpose | RLS |
|---|---|---|
| `clues` | Core clue entity — text, answer, hints, wordplay metadata | Public read (published only), service-role write |
| `daily_puzzles` | Maps a calendar date → clue. 1:1 now, extensible to many-per-day | Public read (published only), service-role write |
| `clue_components` | Normalised wordplay breakdown (one row per ingredient) | Public read (if parent clue published) |
| `clue_wordplay_types` | Lookup table for wordplay type IDs (anagram, reversal, …) | Public read |
| `clue_indicator_types` | Lookup table for indicator type IDs | Public read |
| `user_stats` | Per-user aggregate (streak, XP, level, total solves) | Owner only |
| `solve_history` | Individual solve records (one row per user+clue) | Owner only |
| `clue_reactions` | Like/dislike per user+clue | Owner write, authenticated read |

### Views

| View | Purpose |
|---|---|
| `clue_reaction_counts` | Aggregated like/dislike counts per clue (no user_id exposed) |
| `clue_solve_stats` | Full analytics per clue — hint funnel, avg time, wrong attempts, like % |

### PL/pgSQL Function — `record_solve()`

**Always use this instead of raw upserts.** It atomically writes `solve_history` and updates `user_stats` in one transaction, preventing stats drift.

```sql
record_solve(
  p_user_id             UUID,
  p_clue_id             UUID,
  p_puzzle_number       INTEGER,
  p_hints_used          SMALLINT,
  p_wrong_attempts      INTEGER,
  p_xp_earned           INTEGER,
  p_solve_time_seconds  INTEGER DEFAULT NULL
) RETURNS BOOLEAN   -- TRUE = new solve, FALSE = already solved (idempotent)
```

Called from frontend via `supabase.rpc('record_solve', { ... })` — see `callRecordSolve()` helper.

### Key columns to know

**`daily_puzzles`**
- `date DATE` — the calendar day
- `clue_id UUID` → FK to `clues.id`
- `puzzle_number INTEGER UNIQUE` — user-facing sequential number ("Puzzle #42")
- `sequence_number SMALLINT` — position within a day's set (always 1 for now)
- `published BOOLEAN`

**`clues`**
- `answer TEXT` — uppercase letters only, no spaces (e.g. `'ROSEWATER'`). CHECK enforced.
- `answer_length INTEGER GENERATED` — computed column, always correct
- `answer_pattern TEXT` — display form shown to user (e.g. `'5'`, `'3,4'`, `'4,4,4'`)
- `primary_type TEXT` → FK to `clue_wordplay_types.id`
- `clue_parts JSONB` — display cache of colour-coded segments (treat as derived)
- `hints JSONB` — array of progressive hint cards shown in-game
- `notes TEXT` — internal only, never send to frontend

**`solve_history`**
- `clue_id UUID` (not `puzzle_id`)
- `wrong_attempts INTEGER` — count of incorrect guesses before solving
- `solve_time_seconds INTEGER` — nullable, `> 0` when recorded
- `hints_used SMALLINT >= 0` — no upper bound enforced in DB

**`clue_reactions`**
- `clue_id UUID` (not `puzzle_id`)
- Primary key is `(user_id, clue_id)`

---

## Supabase Types (`src/lib/supabase.ts`)

### Exported types

```ts
// Wordplay / indicator lookup table IDs
type ClueWordplayType = 'anagram' | 'reversal' | 'container' | 'hidden' | 'deletion'
  | 'charade' | 'homophone' | 'double_definition' | 'cryptic_definition' | 'andlit' | 'compound';

type ClueIndicatorType = 'anagram' | 'reversal' | 'container' | 'hidden' | 'deletion'
  | 'homophone' | 'initial_letters' | 'final_letters' | 'alternating_letters' | 'spoonerism';

type ClueComponentRole = 'definition' | 'indicator' | 'fodder'
  | 'container_outer' | 'container_inner' | 'link_word' | 'result';

type PuzzleDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
```

### `DbDailyPuzzle` — the primary game type

Flattened result of `daily_puzzles JOIN clues`. The frontend always works with this type.

```ts
interface DbDailyPuzzle {
  // From daily_puzzles
  number: number;          // puzzle_number — "Puzzle #42"
  date: string;            // ISO date "2026-04-06"

  // From clues
  id: string;              // UUID — needed for reactions and solve records
  published: boolean;
  clue_text: string;
  answer: string;
  answer_length: number;   // generated column
  answer_pattern: string;  // display form: "5", "3,4", "2-3"
  primary_type: ClueWordplayType;
  definition_text: string;
  wordplay_summary: string;
  clue_parts: CluePart[];
  hints: PuzzleHint[];
  difficulty: PuzzleDifficulty;
  author: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}
```

### Other types

```ts
interface DbClueComponent { id; clue_id; step_order; role; clue_text; derived_text; indicator_type; explanation; }
interface DbUserStats     { user_id; streak_count; best_streak; last_solved; total_solved; xp; level; }
interface DbSolveRecord   { id; user_id; clue_id; puzzle_number; hints_used; wrong_attempts; xp_earned; solve_time_seconds; solved_at; }
interface DbClueSolveStats { clue_id; date; primary_type; difficulty; author; total_solves; avg_hints_used; avg_solve_seconds; avg_wrong_attempts; hint_1_opens … hint_4_opens; zero_hint_solves; likes; dislikes; like_pct; }
```

### Helper functions

```ts
// Puzzles
fetchPuzzleByDate(isoDate: string): Promise<DbDailyPuzzle | null>
  // JOINs daily_puzzles + clues, flattens result. Primary page-load query.

fetchPuzzleArchive(): Promise<DbDailyPuzzle[]>
  // All published puzzles newest-first. Used by History page archive tab.

fetchClueComponents(clueId: string): Promise<DbClueComponent[]>
  // Normalised wordplay breakdown. Admin/detail use — not needed for game.

// User stats
fetchUserStats(userId: string): Promise<DbUserStats | null>
upsertUserStats(userId: string, stats): Promise<void>
  // Direct stat write — ONLY for syncLocalStatsToSupabase. Use callRecordSolve() for solves.
syncLocalStatsToSupabase(userId: string, local): Promise<void>
  // Pushes localStorage progress to Supabase on first sign-in. Skips if remote XP >= local.

// Solve history
fetchSolveHistory(userId: string): Promise<DbSolveRecord[]>

callRecordSolve(userId, { clueId, puzzleNumber, hintsUsed, wrongAttempts, xpEarned, solveTimeSeconds? }): Promise<boolean>
  // Calls record_solve() RPC atomically. Returns true = new solve, false = already solved.
  // ALWAYS prefer this over direct upserts to prevent user_stats drift.

// Clue reactions
upsertClueReaction(userId, clueId, reaction: 'like' | 'dislike'): Promise<void>
deleteClueReaction(userId, clueId): Promise<void>
```

### Client and guard

```tsx
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// isSupabaseConfigured = true only when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
// All helpers internally guard on this — they return null/[] silently if not configured.
// Use it to gate features in UI:
if (!isSupabaseConfigured) return <DevWarning />;
```

---

## Hooks

### `useStreak` — XP, streak, levels

```tsx
import { useStreak, getLevelTitle, getXPToNextLevel, getXPForSolve, hasSolvedToday } from '../hooks/useStreak';

const { count, totalSolved, xp, level, bestStreak, recordSolve, refresh } = useStreak();
```

| Field | Description |
|---|---|
| `count` | Current daily streak |
| `totalSolved` | Lifetime puzzles completed |
| `xp` | Total XP earned |
| `level` | Current level (computed from XP) |
| `bestStreak` | All-time highest streak |
| `refresh()` | Re-reads localStorage (call on route change) |
| `recordSolve(hintsUsed, puzzleNumber?, userId?, puzzleId?, wrongAttempts?, solveTimeSeconds?)` | Records a solve — see below |

**`recordSolve` full signature:**
```ts
recordSolve(
  hintsUsed: number,
  puzzleNumber: number = 0,
  userId?: string,          // pass user?.id — enables Supabase sync
  puzzleId?: string,        // pass puzzle UUID — required for DB write; if omitted, DB write skipped
  wrongAttempts: number = 0,
  solveTimeSeconds?: number
): StreakData | null         // null if already solved today
```

- **Always writes localStorage first** — works offline
- If `userId` + `puzzleId` both provided, calls `callRecordSolve()` RPC in background (fire-and-forget)
- **Does NOT call `upsertUserStats` separately** — `record_solve()` RPC handles user_stats atomically
- Guard against double-recording: returns `null` (and skips DB write) if `lastSolved === today`

**XP per solve:** 0 hints → 100 XP | 1 → 75 | 2 → 50 | 3 → 25 | 4+ → 10

**Level formula:** `Math.floor(Math.sqrt(xp / 50)) + 1`

**Level titles:** Newbie Cryptician (1) → Apprentice Solver (2) → Clue Hunter (3-4) → Word Wizard (5-6) → Cryptic Expert (7-9) → Grand Master (10+)

**localStorage key:** `'tco-streak'` — serialized `StreakData` JSON

### `useClueReaction` — like/dislike

```tsx
import { useClueReaction } from '../hooks/useClueReaction';

const { reaction, vote } = useClueReaction(puzzleNumber, userId?, puzzleId?);
// reaction: 'like' | 'dislike' | null
// vote(r): toggles — calling vote with the current reaction removes it
```

- localStorage primary; Supabase write only when both `userId` and `puzzleId` provided
- **localStorage key pattern:** `'tco-reaction-{puzzleNumber}'`

---

## Auth System (Google OAuth via Supabase)

```tsx
import { useAuth } from '../context/AuthContext';

const { user, session, isSignedIn, loading, signIn, signOut } = useAuth();
// user: { id, name, email, picture } | null
// loading: true while getSession() resolves on mount
```

**Sign-in button** — white pill with inline `<GoogleIcon />` SVG:
```tsx
<motion.button
  onClick={signIn}
  style={{ background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: '9999px' }}
  whileHover={{ scale: 1.02 }}
>
  <GoogleIcon /> Sign in with Google
</motion.button>
```

**Flow:** `signIn()` → `supabase.auth.signInWithOAuth({ provider: 'google' })` → Google → redirect back → `onAuthStateChange` fires → `syncLocalStatsToSupabase` pushes local progress.

**Gating content behind auth:**
```tsx
const { isSignedIn, loading } = useAuth();
if (loading) return <LoadingSkeleton />;
if (!isSignedIn) return <SignInGate isDark={isDark} />;
```

**What requires auth:** History page (`/history`) only. Home, Learn, and Puzzle are all free — localStorage keeps state for unauthenticated users.

**Supabase Dashboard setup:**
1. Enable Google provider in Auth → Providers
2. Add your Google OAuth Client ID + Secret (from Google Cloud Console)
3. Add your site URL to Auth → URL Configuration → Redirect URLs

---

## Puzzle Page Architecture

The daily puzzle (`Puzzle.tsx`) is **local-first**. Game logic runs on a hardcoded `PUZZLE` constant:

```ts
const PUZZLE = {
  number: 42,
  clue: 'Pears mixed up to form a weapon (5)',
  answer: 'SPEAR',
  letterCount: 5,
  hints: [ /* up to 4 hint cards */ ],
  clue_parts: [ /* colour-coded segments */ ],
  // ...
};
```

Supabase is only used for:
1. Fetching the puzzle UUID (`puzzleId` state) via `fetchPuzzleByDate` on mount — needed as FK for solve records and reactions
2. Writing the solve record via `callRecordSolve` after a correct answer
3. Writing clue reactions via `useClueReaction`

**Important**: the `puzzleId` fetch is async. In the (rare) case the user solves before it returns, the DB write is silently skipped — `user_stats` will be corrected on next sign-in via `syncLocalStatsToSupabase`, but the `solve_history` row won't be backfilled. Acceptable trade-off for the local-first architecture.

### State tracked in `Puzzle`

| State | Type | Purpose |
|---|---|---|
| `wrongAttempt` | `string \| null` | Last wrong answer string — drives mascot mood + WrongFeedback UI |
| `wrongAttemptsCount` | `number` | Running total of wrong guesses — passed to DB via `record_solve` |
| `hintsUnlocked` | `number` | How many hints revealed |
| `isCorrect` | `boolean` | Triggers `SuccessState` render |
| `solveTime` | `number` | Seconds from page load to correct answer |
| `puzzleId` | `string \| undefined` | UUID from Supabase — fetched on mount |
| `startTime` | `number` | `Date.now()` on mount — constant |

### SuccessState component

Renders when `isCorrect = true`. Receives:
- `hintsUsed`, `wrongAttemptsCount`, `solveTime`, `puzzleId`
- Calls `recordSolve(hintsUsed, PUZZLE.number, user?.id, puzzleId, wrongAttemptsCount, solveTime)` exactly once via `useRef` guard
- Share card shows `🟩🟨🟥` emoji grid with explicit `(N/4 hints used)` count
- Sections order: header ("You got it! 🎊") → share card → XP/stats → breakdown

### Clue parts — colour coding

```ts
const CLUE_PARTS = [
  { text: 'Pears',      type: 'fodder' },      // orange
  { text: ' mixed up ', type: 'indicator' },   // purple
  { text: 'to form ',   type: null },           // plain
  { text: 'a weapon',   type: 'definition' },  // blue
  { text: ' (5)',        type: null },           // plain
];
```

Part color tokens live in `PART_STYLES` in `Puzzle.tsx`:
- `definition` → blue
- `indicator` → purple
- `fodder` → orange
- `wordplay` → green

---

## History Page

Auth-gated. Shows three tabs: **Stats**, **Solve History**, **Archive**.

**Data loading:**
```tsx
const loadData = useCallback(async () => {
  const [history, stats, puzzles] = await Promise.all([
    fetchSolveHistory(user.id),
    fetchUserStats(user.id),
    fetchPuzzleArchive(),
  ]);
  // ...
}, [isSignedIn, user?.id]);
```

Uses `useCallback` so the retry button can call `loadData()` directly (avoids `useEffect` re-trigger issues).

**Stats priority:** Remote Supabase stats preferred; localStorage stats used as fallback if Supabase not configured or user has never solved authenticated.

**Archive → puzzle navigation:** `navigate('/puzzle/${puzzle.number}')` — loads archive view in `Puzzle.tsx`. Currently shows a placeholder ("archive puzzles load here once Supabase is connected") for puzzles other than the hardcoded one.

---

## Infrastructure & CI/CD

### AWS Architecture
| Layer | Service | Purpose |
|---|---|---|
| Storage | S3 | Hosts the static `dist/` build output |
| CDN | CloudFront | Global edge caching + HTTPS termination |
| DNS | Route 53 | Domain → CloudFront alias record |
| IAM | IAM | GitHub Actions deploy role (least-privilege) |

**S3 cache strategy:**
- `dist/assets/**` → `Cache-Control: public,max-age=31536000,immutable`
- `dist/index.html` + root files → `Cache-Control: no-cache,no-store,must-revalidate`

**CloudFront invalidation** — `aws cloudfront create-invalidation --paths "/*"` after every deploy.

### GitHub Actions — `.github/workflows/deploy.yml`

Two jobs:
1. **`build`** — every push + PR to `main`: `npm ci` → `npm run typecheck` → `npm run build`
2. **`deploy`** — push to `main` only: S3 sync → CloudFront invalidation

**Required GitHub Secrets:**
```
VITE_SUPABASE_URL              # injected at build time
VITE_SUPABASE_ANON_KEY         # injected at build time
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
CLOUDFRONT_DISTRIBUTION_ID
```

### TypeScript

```bash
npm run typecheck   # tsc --noEmit — always run this before committing
npm run build       # vite build (bundles but does NOT type-check)
```

Node version: use **v20** via nvm. Dev server: `source ~/.nvm/nvm.sh && nvm use 20 && npm run dev`

---

## localStorage Keys

| Key | Type | Description |
|---|---|---|
| `'tco-dark'` | `'true' \| 'false'` | Dark mode preference |
| `'tco-streak'` | JSON `StreakData` | XP, level, streak counts + solve date history |
| `'tco-reaction-{n}'` | `'like' \| 'dislike'` | Per-puzzle reaction keyed by puzzle number |
| `supabase.auth.*` | SDK-managed | Session tokens — do not read/write manually |

---

## Env Vars

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Set in `.env` for local dev. Set as GitHub Actions secrets for CI/CD. **Never commit real credentials.** When unset, `isSupabaseConfigured = false` and all Supabase features degrade to localStorage-only — the app still fully works.

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

Or use Radix primitives directly (as most pages do).

Toasts via Sonner: `import { toast } from 'sonner';`

---

## Component Conventions

- **Always function components** — no class components
- **Named exports:** `export function PageName() {}`
- **Props inline:** `function Comp({ isDark }: { isDark: boolean }) {}`
- **No Redux / Zustand** — state lives in hooks + context + useState
- **Confetti:** `import confetti from 'canvas-confetti';` — only in Puzzle.tsx success state

---

## UI, Design & UX Patterns

### Visual Identity

The app has a warm, playful-but-smart personality — friendly professor owl. Every design decision should reinforce that: approachable, satisfying, never sterile.

| Element | Rule |
|---|---|
| **Tone** | Encouraging, never intimidating |
| **Mascot** | Ollie appears on key moments — always with a relevant `mood` and `speechBubble` |
| **Colour** | Purple-led. Green = success. Orange = streak/energy. Red = wrong. Blue = info |
| **Spacing** | Generous. Cards `p-5`/`p-6`. Sections breathe with `py-12`/`py-16` |
| **Borders** | Always rounded — `rounded-2xl` (components), `rounded-3xl` (cards). No sharp corners |

### Card Pattern

```tsx
<div
  className="rounded-3xl border p-6"
  style={{
    background: T.cardBg,
    borderColor: T.cardBorder,
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(124,58,237,0.07)',
  }}
>
```

### Typography Hierarchy

| Role | Font | Weight | Size |
|---|---|---|---|
| Page title / hero | Fredoka One | 400 | `clamp(1.8rem, 4vw, 2.6rem)` |
| Section heading | Fredoka One | 400 | `1.2rem – 1.5rem` |
| Body text | Nunito | 600 | `0.9rem – 1rem` |
| Button label | Nunito | 700–800 | `0.85rem – 1rem` |
| Badge / pill | Nunito | 700 | `0.72rem – 0.83rem` |

### Button Styles

Three variants only — do not invent new ones.

**Primary CTA — gradient purple:**
```tsx
<motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
  style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white',
    fontFamily: "'Nunito', sans-serif", fontWeight: 800, borderRadius: '9999px', border: 'none' }}>
```

**Secondary — ghost with border:**
```tsx
<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
  style={{ background: isDark ? '#261845' : '#F5F0FF', color: isDark ? '#C4B5FD' : '#7C3AED',
    border: `1px solid ${isDark ? '#4C3580' : '#C4B5FD'}`, borderRadius: '9999px' }}>
```

**Destructive / muted:**
```tsx
<button style={{ color: isDark ? '#9381CC' : '#6B7280', fontWeight: 600, background: 'transparent', border: 'none' }}>
```

### Colour Usage by Semantic Role

| Meaning | Light bg | Dark bg | Border / text |
|---|---|---|---|
| Brand / primary | `#F5F0FF` | `#261845` | `#7C3AED` / `#C4B5FD` |
| Success | `#ECFDF5` | `#062010` | `#10B981` |
| Error / wrong | `#FFF1F2` | `#2A0F15` | `#FCA5A5` / `#EF4444` |
| Warning / streak | `#FFF7ED` | `#2A1505` | `#F97316` / `#FB923C` |
| Info / definition | `#EFF6FF` | `#0D1F35` | `#3B82F6` / `#93C5FD` |
| Indicator / purple | `#F5F3FF` | `#1A0F35` | `#7C3AED` / `#A78BFA` |

Use `40` hex suffix for 25% opacity borders: `#10B98140`

### Spacing & Layout

- **Max content width:** `max-w-2xl` (672px) for single-column, `max-w-5xl` (1024px) for nav
- **Page padding:** `px-4` mobile, `mx-auto` centered
- **Card gap:** `gap-3` tight, `gap-4` loose
- Grid patterns: `grid grid-cols-2 sm:grid-cols-4 gap-3` (stats), `grid grid-cols-1 sm:grid-cols-2 gap-4` (cards)

### Animation Principles

| Action | Animation |
|---|---|
| Mount | `opacity: 0→1`, `y: 16→0`, `duration: 0.3–0.5` |
| Stagger | `delay: i * 0.05–0.07` |
| Card hover | `whileHover={{ y: -2, scale: 1.02 }}` |
| Button press | `whileTap={{ scale: 0.95–0.97 }}` |
| Success | Spring + confetti. `type: 'spring', stiffness: 400, damping: 24` |
| Idle mascot | `y: [0,-4,0]`, `duration: 3`, `repeat: Infinity` |

### Empty States

Every list must have one — never render nothing:
```tsx
{history.length === 0 && (
  <div className="rounded-2xl border p-8 text-center" style={{ background: T.cardBg, borderColor: T.cardBorder }}>
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧩</div>
    <p style={{ color: T.textMuted, fontSize: '0.9rem' }}>No solves yet — go crack today's puzzle!</p>
  </div>
)}
```

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
5. If auth-gated: add `const { isSignedIn, loading } = useAuth();` guard at top

---

## Common Gotchas

- `motion/react` not `framer-motion` — the import path matters
- `AnimatePresence` must wrap conditional renders for exit animations to fire
- Dark mode requires `isDark` prop drilling into any sub-component that renders colors — no CSS variable fallback
- `T.pageBg` is a CSS gradient string — use `background:` not `backgroundColor:`
- `hide-scrollbar` is defined in `src/styles/tailwind.css`, not a standard Tailwind class
- Dev server requires nvm: `source ~/.nvm/nvm.sh && nvm use 20 && npm run dev`
- **`clue_id` not `puzzle_id`** — the DB renamed all FK columns. Never use `puzzle_id` in queries.
- **`DbDailyPuzzle` not `DbPuzzle`** — old name is gone. The type is a flattened join result.
- **Always use `callRecordSolve()` not direct upserts** — direct upserts to `user_stats` and `solve_history` can get out of sync. The `record_solve()` RPC is the only safe write path.
- `fetchPuzzleByDate` returns a Supabase nested join — the raw Supabase response has `clues` as a nested object (or array typed), which is flattened inside the helper. Don't try to call `.from('clues')` directly for the game query.
- Puzzle `puzzleId` (UUID) is fetched async on mount. It may be `undefined` for the first few hundred ms. Always guard: `if (userId && puzzleId)` before Supabase writes.
- `upsertUserStats` is **not** called after a solve — `callRecordSolve()` handles `user_stats` atomically. `upsertUserStats` is only for the initial sign-in sync via `syncLocalStatsToSupabase`.
