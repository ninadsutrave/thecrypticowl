# Runbook

What to do when something is wrong. Ordered by how likely you are to need it.

Throughout: `$FN` is the Lambda function name, `$BUCKET` the S3 bucket, `$DIST`
the CloudFront distribution id.

---

## Triage: start here

```bash
# 1. What is the site actually serving?
curl -s https://thecrypticowl.com | grep -o '<title>[^<]*'

# 2. Is there a puzzle for today?
curl -s "$SUPABASE_URL/rest/v1/daily_puzzles?select=puzzle_number,date,published&order=date.desc&limit=3" \
  -H "apikey: $SUPABASE_ANON_KEY"

# 3. Did the Lambda run?
aws logs tail "/aws/lambda/$FN" --since 24h --format short
```

Those three answer almost every question below.

---

## Solvers see "Practice clue 🎯"

**What it means.** The app could not load a puzzle and fell back to the
built-in clue. This is the designed failure mode, not a crash — the solve is
explicitly not counted toward anyone's streak.

**Narrow it down.** In the browser console on the live site, look for:

| Console message | Cause |
|---|---|
| `fetchPuzzleByDate timed out after 8000ms` | Network reachable but slow, or DNS hanging |
| `TypeError: Failed to fetch` + `ERR_BLOCKED_BY_CLIENT` | A client-side blocker is filtering `*.supabase.co` — affects that user only |
| `permission denied for schema public` | RLS or grants are broken — affects **everyone** |
| `ERR_NAME_NOT_RESOLVED` | The Supabase project is gone, renamed, or paused |
| No error, puzzle just absent | No published row for today → [see below](#no-puzzle-was-generated-for-today) |

**If it is `permission denied`,** grants were lost. Re-apply the permissions
block at the end of `supabase/migrations/001_initial.sql`:

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
```

**If the project is paused,** Supabase pauses free-tier projects after a week
of inactivity. Resume it from the dashboard; nothing is lost.

---

## No puzzle was generated for today

Check whether the job ran at all:

```bash
aws events describe-rule --name "${FN}-daily"
aws logs tail "/aws/lambda/$FN" --since 24h --format short
```

### The rule is missing or disabled

The schedule is reconciled on every Lambda deploy, so the fastest fix is to
re-run the deploy workflow. To repair it in place:

```bash
aws events put-rule --name "${FN}-daily" \
  --schedule-expression 'cron(15 3 * * ? *)' --state ENABLED
aws events put-targets --rule "${FN}-daily" \
  --targets "Id=1,Arn=$(aws lambda get-function --function-name "$FN" \
    --query 'Configuration.FunctionArn' --output text)"
```

### The rule fired but the run failed

Read the alert, then jump to the matching section below. Generate today's
puzzle manually once you have fixed the cause:

```bash
aws lambda invoke --function-name "$FN" --cli-read-timeout 0 /dev/stdout
```

This is safe to run more than once: the target date is
`max(today, latest + 1)`, so a second invocation schedules tomorrow rather than
colliding with today.

---

## Alert: "Missing required environment variables"

Preflight refused to start. The alert names the exact variables.

```bash
aws lambda get-function-configuration --function-name "$FN" \
  --query 'Environment.Variables | keys'
```

**The usual cause is a deploy that dropped them.** The workflow merges the
deployed environment with the secrets it holds, so a variable disappears only
if it was never a GitHub secret in the first place. Add the secret, then
re-run the deploy.

Verify without generating a puzzle:

```bash
aws lambda invoke --function-name "$FN" \
  --payload "$(echo -n '{"dryRun":true}' | base64)" /dev/stdout
```

`dryRun` runs preflight, resolves both provider clients, and returns before any
AI call or database write.

> Note: both the **setter** and the **judge** need credentials. Running
> `AI_PROVIDER=claude` with `JUDGE_PROVIDER=gemini` requires
> `ANTHROPIC_API_KEY` *and* `GEMINI_API_KEY`.

---

## Alert: "quota exhausted"

Retrying will not help — the fix is billing or waiting.

```
Lambda aborted — gemini quota exhausted: Daily quota exhausted (quotaId=...)
```

**Options, cheapest first:**

1. **Wait.** Per-day quotas reset at midnight Pacific for Gemini. Tomorrow's
   scheduled run recovers on its own, and fills today's gap forward.
2. **Switch provider for one run.** Every provider is already wired:
   ```bash
   aws lambda invoke --function-name "$FN" /dev/stdout   # after setting AI_PROVIDER
   ```
   Set `AI_PROVIDER` as a GitHub repo *variable* and redeploy, or change it
   directly in the console for a one-off.
3. **Enable billing** on the provider.

See [`ai-providers.md`](./ai-providers.md) for free-tier limits per provider.

---

## Alert: "Judge model unavailable for 3 consecutive attempts"

The reviewer model is down. The run aborted deliberately rather than draining
its budget on calls that would all fail the same way.

**This is working as designed** — an unreviewed clue must never ship.

Point the judge at a different provider and re-run:

```bash
# JUDGE_PROVIDER=openai, then:
aws lambda invoke --function-name "$FN" --cli-read-timeout 0 /dev/stdout
```

---

## Alert: "Failed to generate a valid clue after N attempts"

The pipeline exhausted its budget. The alert carries per-stage counts:

```
9 attempts. Tried: CANOE, DRAWER, SPEAR.
4 rejected on wordplay arithmetic, 2 on judge review.
```

**Read the split:**

- **Mostly arithmetic rejections** → the generator is producing mechanically
  broken clues. Usually a prompt regression. Check
  `clue_quality_by_mechanism` for which mechanism is failing:
  ```sql
  SELECT mechanism, total_clues, avg_judge_score, verified_pct
  FROM clue_quality_by_mechanism ORDER BY verified_pct NULLS FIRST;
  ```
- **Mostly editorial rejections** → the clues are mechanically fine but not
  good enough. Often a weaker model, or an unlucky run.
- **A one-off** → just re-invoke. Some days the dice are bad.

The threshold lives in `lambda/games/cryptic/validator/judge.js`
(`MIN_QUALITY_SCORE = 7`). Lowering it ships worse clues; do it knowingly.

---

## A published clue is wrong or unfair

Unpublish it immediately — this hides the clue without deleting anything:

```sql
UPDATE daily_puzzles SET published = false WHERE puzzle_number = <n>;
```

The RLS policy on `clues` gates on a published `daily_puzzles` row, so the
clue becomes unreadable to the app the moment this commits. Solvers who load
the page next will get the previous day's clue via the fallback path.

Then generate a replacement:

```bash
aws lambda invoke --function-name "$FN" --cli-read-timeout 0 /dev/stdout
```

To understand how it got through:

```sql
SELECT clue_text, primary_type, judge_score, judge_surface_quality,
       judge_wordplay_correct, mechanically_verified
FROM clues WHERE id = (SELECT clue_id FROM daily_puzzles WHERE puzzle_number = <n>);
```

`mechanically_verified = false` means the arithmetic was never provable in code
and the model was the only check. If a mechanism keeps producing bad clues,
that is the signal to add or tighten a verifier in `mechanics.js`.

---

## The site is broken after a deploy

The deploy pipeline runs lint, types, tests, a bundle budget and a post-deploy
HTTP smoke test, so this should be caught before you hear about it. If
something still got through:

**Roll back** by re-running the deploy workflow from the last good commit
(Actions → Deploy → Run workflow → pick the ref).

**Check what is actually being served** — assets are immutable and cached for a
year, HTML is `no-store`:

```bash
curl -sI https://thecrypticowl.com | grep -i 'cache-control\|etag'
aws s3 ls "s3://$BUCKET/assets/" --recursive | tail
```

**If the HTML is stale**, the invalidation did not land:

```bash
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/index.html" "/"
```

---

## Sign-in stopped working

1. **Check the Google OAuth redirect URI** still matches
   `https://<project-ref>.supabase.co/auth/v1/callback` exactly.
2. **Check Supabase Auth → URL Configuration** lists the production origin
   under redirect URLs.
3. **Check the anon key** in the deployed bundle — a rotated key needs a
   redeploy, since it is baked in at build time:
   ```bash
   curl -s https://thecrypticowl.com/assets/supabase-*.js | grep -c 'supabase.co'
   ```

Sign-in opens a popup. If a solver reports nothing happening, a popup blocker
is the first thing to rule out — the code falls back to a full redirect when
`window.open` returns null.

---

## Restoring the schedule from scratch

Everything the daily job needs is reconstructible from the repository:

```bash
# 1. Schema
psql "$DATABASE_URL" -f supabase/migrations/001_initial.sql
psql "$DATABASE_URL" -f supabase/migrations/002_pipeline_hardening.sql

# 2. Function + schedule (both reconciled by the workflow)
gh workflow run deploy-lambda.yml

# 3. Confirm
aws lambda invoke --function-name "$FN" \
  --payload "$(echo -n '{"dryRun":true}' | base64)" /dev/stdout
aws events describe-rule --name "${FN}-daily"
```

---

## A game other than cryptic has no puzzle today

Players see "Today's puzzle isn't available right now, so here's a practice
one." Each game is its own Lambda (`<prefix>-<game>`); see
[lambdas.md](./lambdas.md).

```sql
-- What exists for the next few days?
SELECT game, puzzle_date, generator, review->>'attempts' AS attempts
FROM game_puzzles
WHERE puzzle_date >= CURRENT_DATE - 1
ORDER BY game, puzzle_date;
```

1. **The run alert** names each date it created or failed and why
   ("review: …", "judge: …", "generator: …").
2. **Fill it now** — the run is idempotent and skips dates that exist:
   ```bash
   aws lambda invoke --function-name crypticowl-<game> --payload '{}' \
     --cli-binary-format raw-in-base64-out out.json && cat out.json
   ```
3. **Reproduce locally** without touching the database:
   `node lambda/scripts/preview.mjs <game> <date>`. Seeds are
   (game, date, attempt), so a failed date regenerates the same candidates.
4. **Supply warnings** ("only N unused … left") mean a pool needs entries:
   `games/cryptogram/quotes.js` or `games/what-am-i/candidates.js`.

---

## Useful queries

```sql
-- Recent puzzles and their quality scores
SELECT dp.date, dp.puzzle_number, c.answer, c.primary_type,
       c.judge_score, c.mechanically_verified
FROM daily_puzzles dp JOIN clues c ON c.id = dp.clue_id
ORDER BY dp.date DESC LIMIT 14;

-- Quality by mechanism — check after any prompt change
SELECT * FROM clue_quality_by_mechanism ORDER BY avg_judge_score;

-- Is there a buffer ahead of today?
SELECT date, puzzle_number, published FROM daily_puzzles
WHERE date >= CURRENT_DATE ORDER BY date;

-- Which mechanisms have been used recently (variety check)
SELECT c.primary_type, count(*) FROM daily_puzzles dp
JOIN clues c ON c.id = dp.clue_id
WHERE dp.date > CURRENT_DATE - 14 GROUP BY 1 ORDER BY 2 DESC;

-- Pending clue submissions
SELECT id, author_name, clue_text, answer, created_at
FROM clue_submissions WHERE status = 'pending' ORDER BY created_at;
```

---

## Escalation

There is no on-call rotation. The failure mode is "no new puzzle today", which
degrades to yesterday's clue and then to a labelled practice clue — solvers are
never shown a broken page or a silently fake streak.

That means **nothing here is a middle-of-the-night problem.** Fix it in the
morning.
