# Roadmap

Known gaps and planned work, with honest status. This supersedes the old
`remaining-work.txt` scratch file, whose items are all shipped.

Ordered by consequence, not effort.

---

## Live defects

Things that are wrong in production right now.

### Clue ratings are silently discarded — **critical**

`useClueReaction` writes to `clue_reactions` as the authenticated user, but the
only write policy on that table requires `service_role`, and RLS is forced.
Every insert is denied. The failure is a `console.warn` while the UI still
shows "Thanks! 🙏".

The table is therefore permanently empty, so `clue_reaction_counts` and the
`likes`/`dislikes`/`like_pct` columns of `clue_solve_stats` are hardcoded
zeros. There is no solver-side quality signal at all.

*Fix:* an owner-write policy mirroring `solve_history`, plus making
`upsertClueReaction` reject rather than swallow so the widget can revert its
optimistic state. Details in [`database.md`](./database.md#known-gaps).

### Streaks can only ever go up

`useStreak` merges local and remote stats with `Math.max` on every field. A
legitimately broken streak is restored from whichever side is stale, and the
two never reconcile downward.

Making the server authoritative is the correct fix, but it changes what
existing solvers see the next time they open the app — so it is a product
decision, not a refactor. Flagged rather than done.

### `record_solve` trusts the client

`p_client_date`, `p_hints_used` and `p_wrong_attempts` arrive from the browser
unvalidated beyond an XP ceiling. The date parameter exists for a real reason
(timezone-correct streaks) but nothing stops a crafted call fabricating one.

*Fix:* clamp `p_client_date` server-side to within a day of `CURRENT_DATE`.

### Archive solves count as today's solve

Solving `/puzzle/1` when you haven't played today records a streak day. A
solver can build a streak entirely out of the archive.

*Fix:* pass a flag so archive solves record history without touching the
streak.

---

## Documented-but-untrue

Claims that need either code or a correction.

### The privacy policy contradicts itself

The Cookies section says "We do not use any third-party advertising or
tracking cookies"; the Analytics section says Google Analytics is used. GA4
sets `_ga`/`_gid`, which are exactly that.

There is also no consent gate — a real ePrivacy/GDPR exposure for a product
whose stated audience is British solvers. The interaction-gated GA loader in
`index.html` is already the right hook to hang consent on.

*Status: the wording is corrected; the consent gate is not built.*

### No offline *caching*

There is a dedicated offline screen, and the app degrades clearly when the
connection drops. What is still missing is a service worker: the app cannot be
*loaded* without a network, and a solve recorded while offline is never pushed
— `callRecordSolve` is fire-and-forget with no retry queue.

*Status: the README claim is corrected and the offline state is built. Caching
and background sync are below.*

---

## Planned

### Accessibility pass

The largest remaining quality gap, and the one with real users behind it.

- The answer input has `focus:outline-none` with no replacement ring —
  keyboard focus is invisible on the app's primary control (WCAG 2.4.7).
- That input has no `<label>` or `aria-label`, only a placeholder.
- Wrong-answer feedback is not in an `aria-live` region, so screen readers
  announce nothing.
- `Learn.tsx` has zero `aria-`/`role`/`htmlFor` attributes; its five tabs are
  plain buttons rather than a `tablist`.
- The decorative floating letters on the About page are not `aria-hidden`, so a
  screen reader reads "E A ? T R S ★ N I" before the headline.
- The submission form's labels are not associated with their inputs.

### Social preview image

`og:image` points at `favicon.svg`. No major platform renders SVG previews, so
every shared link is a bare text card — which undercuts the share-result
feature that exists to drive growth. A 1200×630 PNG is the whole fix.

### Onboarding

- "Sign in" in the nav is a `NavLink` to `/history`, a gated page that then
  shows another sign-in prompt. It never calls `signIn()`.
- The OAuth popup redirects to the origin and is never closed, leaving the
  solver looking at a second copy of the app in a small window.
- The 🔥 streak chip is hidden from signed-out solvers, even though streaks are
  tracked locally from the first solve — the single strongest reason to create
  an account is invisible to everyone who hasn't.

### Offline caching and background sync

A service worker so the app shell loads without a network, plus a background-
sync queue for `callRecordSolve` so a solve made offline eventually reaches the
server. Only worth doing properly — a cache that serves yesterday's clue as
today's is worse than the clear offline state that exists now.

### Recharts is disproportionate

530 KB for one multi-series line chart. It is lazy-loaded now, so it costs
nothing to solvers who never open Progress, but for those who do it dwarfs the
rest of the app. Two or three series on linear axes with a tooltip does not
need a charting library; a hand-rolled SVG chart would be a fraction of it.

### Column-level protection for `clues.notes`

Commented "internal only, never sent to the frontend", but RLS is row-level.
`SELECT notes FROM clues` works for `anon`. Convention, not enforcement.

### `user_stats.level` is dead

Never written by `record_solve`; sits at 1 forever while the frontend
recomputes from XP. Either compute it in the RPC or drop the column.

### `app_likes` is unguarded

`WITH CHECK (true)` for `anon`. A script can inflate the counter and grow the
table without bound. Low stakes, but unbounded.

---

## Shipped

Recorded so the history is legible.

**From `remaining-work.txt`** — all complete:

- Contributor name, email and social link on the submission form
- Author name and profile shown on the daily clue
- "Become a Contributor" moved to the end of the home page
- `authors` table, referenced by `clues.author_id`, seeded with every provider
- Timer starts only once the clue has rendered
- Lint, formatting and type checks green

**Pipeline:**

- Deterministic wordplay verification for all fifteen mechanisms
  (`mechanics.js`), with the literal/substitutable split
- Judge decoupled from Gemini; `JUDGE_PROVIDER` selects the reviewer
  independently, and preflight requires both providers' keys
- Single provider registry — env keys, author id and clients all derive from it
- Answer uniqueness screened before generation rather than at insert
- Rejected words fed back into the planner within a run
- Fixed: the three-outage abort was swallowed by the inner catch and never
  fired; Gemini read the response body twice on an exhausted 429; OpenAI strict
  schemas returned 400; whitespace-only link segments rejected valid clues

**Frontend:**

- `Puzzle.tsx` 2,348 → 741 lines across focused modules
- 60 dependencies → 8; `npm audit` 2 high → 0
- `index.html` 102 KB → 34 KB; Progress chunk 416 KB → 22 KB
- All storage behind `localStore.ts`; sign-out now clears user data
- `useStreak` shares one snapshot, so the navbar updates after a solve
- Anti-spoiler hints restored — hint 3 no longer names the fodder
- The offline fallback clue no longer awards XP or a streak day, and says why
- Puzzle fetches bounded at 8s, so a blocked network shows a clue rather than
  an indefinite spinner

**Content and resilience:**

- Dedicated offline screen, with automatic recovery on reconnect and an
  explicit reassurance that local progress is safe
- Privacy policy no longer contradicts itself about analytics cookies

**CI/CD:**

- 221 tests where there were none; coverage gated on the validator
- `lambda/` linted, formatted and tested in CI for the first time
- Deploy no longer wipes environment variables
- EventBridge schedule in version control
- Log retention 1 → 14 days
- `dryRun` smoke test, post-deploy HTTP smoke test, bundle budget, dependency
  audit
