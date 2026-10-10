# Roadmap

Known gaps and planned work, with honest status. This supersedes the old
`remaining-work.txt` scratch file, whose items are all shipped.

Ordered by consequence, not effort.

---

## Live defects

Things that are wrong in production right now.

### Streaks can only ever go up

`useStreak` merges local and remote stats with `Math.max` on every field. A
legitimately broken streak is restored from whichever side is stale, and the
two never reconcile downward.

Making the server authoritative is the correct fix, but it changes what
existing solvers see the next time they open the app — so it is a product
decision, not a refactor. Flagged rather than done.

---

## Documented-but-untrue

Claims that need either code or a correction.

### No offline *caching*

There is a dedicated offline screen, and the app degrades clearly when the
connection drops. What is still missing is a service worker: the app cannot be
*loaded* without a network, and a solve recorded while offline is never pushed
— `callRecordSolve` is fire-and-forget with no retry queue.

*Status: the README claim is corrected and the offline state is built. Caching
and background sync are below.*

---

## Planned

### Onboarding

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

### `user_stats.level` is dead

Never written by `record_solve`; sits at 1 forever while the frontend
recomputes from XP. Either compute it in the RPC or drop the column.

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

**Hardening (migration 008 and its frontend):**

- Future puzzles unreadable until their date begins somewhere (UTC+14); the
  cryptic answer was readable as soon as it was generated
- Clue ratings save (owner-write policy); a failed save rolls the widget back
- `record_solve` validates the date (±1 day), counts, and that the clue is
  that day's puzzle; archive solves no longer touch streaks or XP
- `app_likes` throttled server-side; `clues.notes` hidden by column grants;
  `clue_solve_stats` no longer readable by every signed-in user
- Cookie consent: Google Analytics loads only after "Accept"; choice can be
  changed from the Privacy page
- 1200×630 social preview image; navbar "Sign in" signs in directly and the
  popup closes itself
- Accessibility: labelled answer input, wrong answers announced, Learn tabs
  are a real tablist with arrow keys

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
