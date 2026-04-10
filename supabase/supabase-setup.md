# Supabase Setup Guide

Complete walkthrough to take a fresh Supabase project to a fully working production database for The Cryptic Owl.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose an organisation, set a project name (e.g. `crypticowl-prod`) and a strong database password — **save this password**, you'll need it for migrations via CLI
3. Select the region closest to your AWS deployment region (same region = lower latency)
4. Wait for provisioning (~2 minutes)

---

## 2. Grab Your Project Credentials

In the Supabase Dashboard → **Project Settings → API**:

| Key | Where it goes |
|-----|---------------|
| **Project URL** | `VITE_SUPABASE_URL` in `.env` and GitHub secret |
| **anon / public key** | `VITE_SUPABASE_ANON_KEY` in `.env` and GitHub secret |
| **service_role / secret key** | Server-side only — never expose in the frontend |

---

## 3. Configure Google OAuth

### 3a. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **New project** (or use an existing one)
2. Enable the **Google Identity** API: APIs & Services → Library → search "Google Identity" → Enable
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Under **Authorised redirect URIs**, add exactly:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (Replace `<your-project-ref>` with the subdomain from your Supabase project URL)
6. Click **Create** — copy the **Client ID** and **Client Secret**

### 3b. Supabase Dashboard

1. Dashboard → **Authentication → Providers → Google**
2. Toggle Google **Enabled**
3. Paste the **Client ID** and **Client Secret** from step 3a
4. Save

### 3c. Configure Redirect URLs

Dashboard → **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://your-production-domain.com` |
| **Redirect URLs** | `https://your-production-domain.com` |

For local dev, add `http://localhost:5173` to **Redirect URLs** (the Site URL stays as production).

> The app opens Google sign-in in a popup. After auth, Google redirects to the Supabase callback URL, which then redirects to your **Site URL**. The popup closes and `onAuthStateChange` fires in the parent window.

---

## 4. Run the Migration

The entire schema, RLS policies, functions, triggers, and seed data are in one file:

```
supabase/migrations/001_initial.sql
```

### Option A — Supabase SQL Editor (recommended for first-time setup)

1. Dashboard → **SQL Editor → New query**
2. Paste the full contents of `001_initial.sql`
3. Click **Run** (or Cmd/Ctrl + Enter)
4. Verify: Table Editor should show 7 tables

### Option B — Supabase CLI

```bash
# Install Supabase CLI
brew install supabase/tap/supabase   # macOS
# or: npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

---

## 5. Verify Tables and Schema

After running the migration, confirm the following in **Table Editor**:

| Table | Purpose |
|-------|---------|
| `clue_wordplay_types` | Lookup: anagram, reversal, container, etc. |
| `clue_indicator_types` | Lookup: indicator words per wordplay type |
| `clues` | Core clue data — text, answer, hints, clue_parts |
| `daily_puzzles` | Maps date → clue, holds puzzle_number, published flag |
| `clue_components` | Normalised step-by-step wordplay breakdown |
| `user_stats` | Per-user streak, XP, best streak |
| `solve_history` | Per-user per-clue solve record |
| `clue_reactions` | Per-user like/dislike per clue |

And two views: `clue_reaction_counts`, `clue_solve_stats`

Check the seed puzzle: run this in SQL Editor:
```sql
SELECT dp.puzzle_number, dp.date, c.clue_text, c.answer
FROM daily_puzzles dp
JOIN clues c ON c.id = dp.clue_id
WHERE dp.published = true;
```
Should return Puzzle #1: "Stone broken becomes musical sounds (5)" → TONES.

---

## 6. Verify RLS Policies

In **Authentication → Policies**, confirm each table has the correct policies:

| Table | Policies |
|-------|---------|
| `clue_wordplay_types` | `public_read`, `service_write` |
| `clue_indicator_types` | `public_read`, `service_write` |
| `clues` | `clues_public_read` (published only), `clues_service_write` |
| `daily_puzzles` | `daily_puzzles_public_read` (published only), `daily_puzzles_service_write` |
| `clue_components` | `clue_components_public_read`, `clue_components_service_write` |
| `user_stats` | `user_stats_owner` (own row only) |
| `solve_history` | `solve_history_owner` (own row only) |
| `clue_reactions` | `clue_reactions_owner`, `clue_reactions_authenticated_read`, `clue_reactions_service_write` |

Quick RLS smoke test (run as anon = no auth header):
```sql
-- Should return Puzzle #1 (published)
SELECT puzzle_number FROM daily_puzzles WHERE published = true;

-- Should return 0 rows (unpublished clue blocked)
SELECT id FROM clues WHERE NOT EXISTS (
  SELECT 1 FROM daily_puzzles WHERE clue_id = clues.id AND published = true
);
```

---

## 7. Verify the record_solve Function

In **Database → Functions**, confirm `record_solve` exists with `SECURITY DEFINER`.

Test it manually in SQL Editor (replace the UUID with a real auth.users id if available):
```sql
SELECT record_solve(
  gen_random_uuid(),    -- p_user_id (fake for testing)
  (SELECT id FROM clues LIMIT 1),  -- p_clue_id
  1,                    -- p_puzzle_number
  0,                    -- p_hints_used
  0,                    -- p_wrong_attempts
  100,                  -- p_xp_earned
  NULL,                 -- p_solve_time_seconds
  CURRENT_DATE          -- p_client_date
);
-- Should return TRUE
```

---

## 8. Set Environment Variables

### Local Development

Create `.env` at the project root (`.env.example` is already committed):

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Then run:
```bash
npm run dev
```

### GitHub Actions Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | Your project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon key |
| `AWS_ACCESS_KEY_ID` | AWS IAM key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `AWS_REGION` | e.g. `ap-south-1` |
| `S3_BUCKET_NAME` | Your S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | Your CloudFront distribution ID |

---

## 9. Enable GitHub Branch Protection

This is what makes CI actually block bad merges.

GitHub repo → **Settings → Branches → Add branch protection rule**:

- Branch name pattern: `master`
- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**
  - Search and add: `Lint, Format, Type-check & Build` (the job name from `ci.yml`)
- ✅ **Require branches to be up to date before merging**
- ✅ **Do not allow bypassing the above settings** (optional but recommended)

---

## 10. Adding Puzzles to the Database

Every puzzle needs three inserts (or use the Supabase Dashboard table editor):

### Step 1 — Insert the clue
```sql
INSERT INTO clues (
  clue_text, answer, answer_pattern,
  primary_type, definition_text, wordplay_summary,
  difficulty, clue_parts, hints
) VALUES (
  'Your clue text here (N)',
  'ANSWER',
  'N',
  'anagram',           -- see clue_wordplay_types for valid IDs
  'the definition part',
  'One-line explanation shown after solve',
  'medium',
  '[]',                -- JSON array of {text, type} segments
  '[]'                 -- JSON array of hint cards
);
```

### Step 2 — Schedule it as a daily puzzle
```sql
INSERT INTO daily_puzzles (date, clue_id, published, sequence_number, puzzle_number)
SELECT
  '2026-04-10',         -- the date it should appear
  id,
  false,                -- set true only when ready to go live
  1,
  2                     -- next sequential puzzle number
FROM clues
WHERE clue_text = 'Your clue text here (N)';
```

### Step 3 — Add structural components (optional but recommended)
```sql
INSERT INTO clue_components (clue_id, step_order, role, clue_text, derived_text, indicator_type, explanation)
SELECT c.id, v.*
FROM clues c
CROSS JOIN (VALUES
  (1, 'definition', 'the definition', 'ANSWER', NULL, 'Plain definition'),
  (2, 'indicator',  'indicator word', NULL, 'anagram', '"indicator word" signals anagram'),
  (3, 'fodder',     'fodder word', 'ANSWER', NULL, 'fodder → ANSWER')
) AS v(step_order, role, clue_text, derived_text, indicator_type, explanation)
WHERE c.clue_text = 'Your clue text here (N)';
```

### Publishing
When ready to go live, set `published = true`:
```sql
UPDATE daily_puzzles SET published = true WHERE puzzle_number = 2;
```

---

## 11. Useful SQL Queries

```sql
-- See all scheduled puzzles with their clues
SELECT dp.puzzle_number, dp.date, dp.published, c.clue_text, c.answer, c.difficulty
FROM daily_puzzles dp
JOIN clues c ON c.id = dp.clue_id
ORDER BY dp.date;

-- See solve analytics per puzzle
SELECT * FROM clue_solve_stats ORDER BY date DESC;

-- See reaction counts per clue
SELECT c.clue_text, rc.likes, rc.dislikes
FROM clue_reaction_counts rc
JOIN clues c ON c.id = rc.clue_id;

-- Find users with the longest streaks
SELECT user_id, best_streak, streak_count, total_solved, xp
FROM user_stats
ORDER BY best_streak DESC
LIMIT 20;
```
