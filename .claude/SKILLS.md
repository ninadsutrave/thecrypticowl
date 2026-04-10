# CrypticOwl — LLM Contributor Guide

A daily cryptic crossword learning app. One clue per day, gamified with streaks, XP, and levels. React frontend backed by Supabase (Postgres + Auth) and an automated AWS Lambda clue generator.

---

## Stack

| Layer | Tool |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 + inline `style` props (see Styling section) |
| Animation | `motion/react` (Framer Motion v12) |
| Charts | `recharts` (Interactive line charts for history) |
| Icons | Lucide React |
| Backend | Supabase (Postgres + Google OAuth) |
| Clue Gen | AWS Lambda (Node 20 + Gemini 1.5 Flash) |
| Analytics | Google Analytics 4 (via `gtag.js`) |
| Persistence | `localStorage` (primary) + Supabase (sync when authenticated) |
| Fonts | Fredoka One (headings), Nunito (body) |

---

## Project Structure

```
src/
  lib/
    supabase.ts              # Supabase client, all DB types, all helper functions
  app/
    App.tsx                  # Root: DarkModeProvider + AuthProvider wrap RouterProvider
    routes.tsx               # Route config: Root > { Home, Learn, Puzzle, Puzzle/:number, History, Privacy, NotFound }
    theme.ts                 # LIGHT + DARK color token objects + getTheme()
    context/
      DarkModeContext.tsx    # isDark state + toggle(), persisted to localStorage
      AuthContext.tsx        # Google OAuth session, user object, signIn/signOut
    hooks/
      useStreak.ts           # XP / streak / level logic — localStorage + Supabase sync
      useClueReaction.ts     # Like/dislike reaction state — localStorage + Supabase sync
    pages/
      Root.tsx               # Layout: sticky nav, dark toggle, mobile menu, streak, auth, footer, <Outlet />
      Home.tsx               # Landing: hero (dynamic puzzle), stats strip, wordplay preview
      Learn.tsx              # Guide: 5 sections — Intro, Parts, Wordplay, Indicators, Synonyms
      Puzzle.tsx             # Daily puzzle: dynamic fetching, clue, answer grid, hints, confetti, share
      History.tsx            # Auth-gated: interactive charts (recharts), solve history, puzzle archive
      Privacy.tsx            # Descriptive privacy policy with Google OAuth & Analytics transparency
      NotFound.tsx           # Fun 404 page with mascot "Ollie"
    components/
      Mascot.tsx             # Ollie the Owl — SVG mascot with mood states and speech bubbles
      ui/                    # Radix UI / shadcn components

lambda/
  index.js                   # AWS Lambda: Gemini 1.5 Flash clue generator (Ximenean standards)
  package.json               # Lambda dependencies

supabase/
  migrations/
    001_initial.sql          # Single migration file — full schema, seed data, RLS, functions
```

---

## Routing

```
/               → Home.tsx
/learn          → Learn.tsx
/puzzle         → Puzzle.tsx          (today's dynamic puzzle from DB)
/puzzle/:number → Puzzle.tsx          (archive view by number)
/history        → History.tsx         (requires sign-in — interactive stats)
/privacy        → Privacy.tsx         (legal/contact info)
/*              → NotFound.tsx        (404 handler)
```

---

## Styling — Critical Rules

**This codebase does NOT use Tailwind color classes.** All colors come from the theme system via inline `style` props.

### The theme pattern
```tsx
const { isDark } = useDarkMode();
const T = getTheme(isDark);
style={{ background: T.cardBg, color: T.text }}
```

### Brand color palette
```
Purple:           #7C3AED (primary CTA)    #5B21B6 (gradient end)   #C4B5FD (light text)
Blue (info):      #3B82F6 border           #EFF6FF bg-light          #0D1F35 bg-dark
Green (success):  #10B981 border           #ECFDF5 bg-light          #062010 bg-dark
Red (error):      #FCA5A5 border           #FFF1F2 bg-light          #2A0F15 bg-dark
Orange (streak):  #F97316 border           #FFF7ED bg-light          #2A1505 bg-dark
```

---

## Data Fetching & Architecture

### Dynamic Puzzles
The app is **dynamic-first with local fallback**.
- `Puzzle.tsx` calls `fetchPuzzleByDate(today)` on mount.
- If the DB is empty or unreachable, it falls back to a high-quality hardcoded `DEFAULT_PUZZLE`.
- Archive puzzles (`/puzzle/:number`) are fetched via `fetchPuzzleByNumber(number)`.

### Solve History & Analytics
Authenticated users see a rich dashboard in `History.tsx`:
- **Solve Insights**: Interactive `LineChart` from `recharts` showing trends for Hints, Wrong Guesses, and Solve Time.
- **Activity Heatmap**: A 12-week grid visualizing solve consistency.
- **Trend Analysis**: Improvement percentages calculated by comparing early vs. recent performance.

---

## Clue Generation (AWS Lambda)

A scheduled Lambda function (`lambda/index.js`) generates daily clues using **Gemini 1.5 Flash**.

### Compiler Standards (Ximenean)
- **Lexical Planner**: Selects a high-quality word (4-10 letters, no proper nouns).
- **Clue Generator**: Writes elegant clues with smooth surface readings.
- **Structure**: Definition must be at the very start or end of the clue.
- **Validation**: A multi-stage judge verifies the clue's fairness, ensures the answer isn't leaked, and checks for valid metadata (hints, parts).

---

## Deployment & CI/CD

### Web Deployment (S3 + CloudFront)
Managed via `.github/workflows/deploy.yml`.
- Builds static site with Vite.
- Syncs to S3 and invalidates CloudFront cache.
- Requires: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`.

### Lambda Deployment
Managed via `.github/workflows/deploy-lambda.yml`.
- **Idempotent**: Attempts to `update-function-code` first, falls back to `create-function` if not found.
- Packages code + dependencies into a zip.
- Injects `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables.

---

## Analytics & Tracking

### Google Analytics 4
- Integrated in `index.html` via `gtag.js`.
- Uses `VITE_GA_ID` environment variable (e.g., `G-XXXXXXXXXX`).
- Only anonymous usage data is collected (page views, solve events).

---

## Common Dev Tasks

### Adding a Clue Manually
Insert into `clues` table in Supabase, then map it in `daily_puzzles` with a `date` and `puzzle_number`.

### Running Locally
1. `npm install`
2. Create `.env` from `.env.example`
3. `npm run dev`
4. For Lambda testing: `cd lambda && npm install && node test-local.js` (if created).

### Linting & Formatting
```bash
npm run format      # Prettier
npm run lint:fix    # ESLint + Auto-fix
npm run typecheck   # TS compiler check
```

---

## Core Guidelines for LLMs
1. **Never use Tailwind color classes** (e.g., `bg-purple-500`). Use `style={{ background: T.cardBg }}`.
2. **Follow the Mascot mood system**: Use `thinking` for loading, `correct` for success, `wrong` for errors.
3. **Keep the footer in Root.tsx**: It contains critical copyright and legal links.
4. **Use `record_solve` RPC**: Never upsert `user_stats` directly; use the Supabase function to maintain atomicity.
5. **Responsive first**: Use `flex`, `grid`, and `clamp()` for all layouts.
