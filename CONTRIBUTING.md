# Contributing

---

## Setup

```bash
npm install
cp .env.example .env      # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Without Supabase credentials the app still runs — it serves the built-in
practice clue, which is enough for most UI work.

---

## The one command

```bash
npm run verify    # lint + format + typecheck + test, across src/ and lambda/
```

This is exactly what CI runs. If it passes locally, CI passes.

```bash
npm test                 # 221 tests
npm run test:watch       # watch mode
npm run test:coverage    # enforces thresholds on the validator
npm run format           # fix formatting
npm run lint:fix         # fix what ESLint can
npm run build            # production build
node scripts/check-bundle-budget.mjs   # after a build
```

---

## Conventions

**Comments explain *why*.** The code already says what it does. A comment
earns its place by recording the reason a decision was made, or the failure
that made it necessary — the kind of thing the next person would otherwise have
to rediscover by breaking it.

**No new colour literals in pages.** Colours come from `src/app/theme.ts`.
A literal in a page is a signal that a colour is genuinely one-off; if it
appears twice, it belongs in the theme.

**All browser storage goes through `src/app/lib/localStore.ts`.** Direct
`localStorage` access is what made sign-out leak the previous user's streak.
Keys are namespaced `tco-`.

**All database access goes through `src/lib/supabase.ts`.** Nothing else
imports the Supabase client. This keeps the app's entire data surface auditable
in one file, and is what lets the 228 KB SDK stay off the critical path.

**Keep the Lambda dependency-light.** It has two runtime dependencies. Every
addition is cold-start cost on a job that runs once a day.

**Split a page before it reaches ~700 lines.** `src/app/pages/puzzle/` is the
pattern: one directory, focused modules, pure logic extracted into `.ts` files
that can be tested without rendering.

---

## Testing

Two Vitest projects, because the two halves have different runtimes:

| Project | Environment | Matches |
|---|---|---|
| `lambda` | node | `lambda/**/*.test.js` |
| `web` | jsdom | `src/**/*.test.{ts,tsx}` |

```bash
npx vitest run --project lambda
npx vitest run --project web
```

**What is worth testing here:** pure functions over plain data, and anything
where being wrong is invisible. The clue validator is the clearest case — a
false pass ships a broken clue as the day's puzzle, and nobody finds out until
a solver gives up.

**What is not:** JSX structure, framer-motion transitions, styling. Extract the
logic and test that instead.

Coverage thresholds are enforced on `lambda/games/cryptic/**` in CI, so a new mechanism
cannot be merged without tests for it.

---

## Adding a wordplay mechanism

End to end, using `palindrome` as the example.

### 1. Register it

```js
// lambda/games/cryptic/constants/prompts.js
export const WORDPLAY_TYPES = [ /* … */ 'palindrome' ];
```

Add a line to `MECHANISM_SELECTION_GUIDANCE` in `LEXICAL_PLANNER_SYSTEM`
explaining when the mechanism is a good fit, and a rule to
`CLUE_GENERATOR_SYSTEM` describing what a fair clue of that type looks like.

### 2. Add it to the database

```sql
-- supabase/migrations/00N_palindrome.sql
INSERT INTO clue_wordplay_types (id, label, description) VALUES
  ('palindrome', 'Palindrome', 'The answer reads the same in both directions')
ON CONFLICT (id) DO NOTHING;
```

If it needs its own indicator category, add a row to `clue_indicator_types`
too, and map it in `INDICATOR_TYPE_MAP` in `lambda/games/cryptic/services/dbService.js`.

### 3. Write the verifier

This is the important step. In `lambda/games/cryptic/validator/mechanics.js`:

```js
/** The answer reads identically forwards and backwards. */
export function verifyPalindrome(_fodder, answer) {
  const a = letters(answer);
  if (!a) return meh('No answer supplied to check.');
  const reversed = a.split('').reverse().join('');
  return reversed === a
    ? ok(`${a} reads the same in both directions.`)
    : no(`${a} is not a palindrome — reversed it is ${reversed}.`);
}
```

Then route it in `verifyMechanism()`.

**Decide the verdict type deliberately.** This is the design decision, not the
arithmetic:

- **`REFUTED`** (`no`) — only when the mechanism *requires* literal fodder, so a
  failure is genuinely decisive. A palindrome is a property of the answer
  itself, so this qualifies.
- **`UNVERIFIABLE`** (`meh`) — when the fodder may legitimately be a synonym.
  A failed literal check proves nothing, and hard-rejecting would throw away
  valid clues.
- **`VERIFIED`** (`ok`) — the letters work out exactly.

Getting this wrong is costly in both directions: too eager to refute and you
reject good clues without an AI ever seeing them; too reluctant and broken
clues reach solvers on the model's say-so.

### 4. Test it

In `mechanics.test.js` — use **real cryptic examples**, not synthetic strings:

```js
describe('verifyPalindrome', () => {
  it('verifies a genuine palindrome', () => {
    expect(verifyPalindrome('', 'LEVEL').status).toBe(VERIFIED);
    expect(verifyPalindrome('', 'ROTATOR').status).toBe(VERIFIED);
  });

  it('REFUTES a non-palindrome', () => {
    expect(verifyPalindrome('', 'CANOE').status).toBe(REFUTED);
  });
});
```

Add it to the dispatch test's table too.

### 5. Teach it

- `lambda/games/cryptic/builder/hintBuilder.js` → `FODDER_HINT_TEXT` — hint 3 guidance
  that describes the trick **without naming the fodder**.
- `lambda/games/cryptic/constants/clue.js` → `MECHANISM_DESCRIPTIONS` — hint 4.
- `src/app/pages/puzzle/hints.ts` → `FODDER_GUIDANCE` and
  `MECHANISM_DESCRIPTIONS` — the frontend's fallback path.
- `src/app/pages/Puzzle.tsx` → `MECHANISM_NUDGE` — Ollie's hint-2 line.
- `src/app/pages/Learn.tsx` — a worked example for solvers.

### 6. Verify

```bash
npm run verify
```

The hint-builder tests assert that every mechanism has a description and that
no hint ever leaks the answer, so a missing entry fails the build.

---

## Adding an AI provider

1. `lambda/shared/constants/<provider>.js` — model ids, base URL, temperatures.
2. `lambda/shared/clients/providers/<provider>.js` — export `call<Provider>` and
   `call<Provider>Judge`. If it speaks the OpenAI wire format, delegate to
   `_openaiCompatible.js`.
3. `lambda/shared/constants/providers.js` — add the entry. **This is the single
   registry**: env keys, author id and client all derive from it, so a provider
   cannot be half-registered.
4. A migration seeding its `authors` row with the id you used.
5. `lambda/shared/clients/aiClient.js` — add to `GENERATORS` and `JUDGES`.
6. A case in `index.test.js` covering preflight for it.
7. The secret in the deploy workflow's `MANAGED` list.

Schema dialects differ. `_schemaUtils.js` converts the Gemini-flavoured schemas
into standard JSON Schema, with a `strict` mode for OpenAI structured outputs
(which requires every property to be listed in `required`).

---

## Pull requests

- Branch from `master`.
- `npm run verify` must pass.
- Keep the change scoped. A refactor and a behaviour change in one PR is two
  PRs.
- If you change what the generator writes, say what you saw in
  `clue_quality_by_mechanism` before and after.
- If you find a bug while doing something else, note it in
  [`docs/roadmap.md`](./docs/roadmap.md) rather than fixing it inline.
