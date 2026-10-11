# 🦉 The Cryptic Owl

**Master the art of cryptic crosswords, one day at a time.**

One British-style cryptic clue a day, with progressive hints that teach the
mechanics rather than just handing over the answer. Clues are generated and
quality-checked automatically, and the wordplay arithmetic is *proved in code*
before anything reaches a solver.

[thecrypticowl.com](https://thecrypticowl.com)

---

## 📸 Preview

### Today's Puzzle

<p align="center">
  <img src="./docs/screenshots/puzzle-desktop.png" alt="Daily Puzzle — desktop view with Ollie the mascot, clue card, and answer input" width="860" />
</p>

### Learn Hub

<p align="center">
  <img src="./docs/screenshots/learn-desktop.png" alt="Learn Hub — interactive guide with Intro, Parts, Wordplay, Compound, and Synonyms tabs" width="860" />
</p>

---

## ✨ Features

- **🧩 Daily cryptic clue** — a new clue every day, across fifteen wordplay
  mechanisms, with variety enforced from usage history.
- **💡 Progressive hints** — four steps, from "which end is the definition" to
  the full breakdown. Deliberately never names the fodder before the last step.
- **🎓 Learn hub** — the anatomy of a cryptic clue, the indicator vocabulary,
  and worked examples of every mechanism.
- **🔥 Streaks, XP and levels** — scored by how few hints you needed.
- **🦉 Ollie the owl** — reacts to your progress, and his nudges are specific to
  the mechanism in front of you.
- **📊 Solve history** — signed-in solvers get a trend chart of hints, wrong
  guesses and solve times over time.
- **🌙 Real dark mode** — a designed second palette, not an inversion, with
  contrast checked against WCAG AA.
- **📶 Plays without an account** — streaks and XP are kept in the browser and
  pushed to your account when you sign in. (The app itself still needs a
  network connection to load; there is no service worker yet — see
  [the roadmap](./docs/roadmap.md).)

---

## 🚀 New here?

1. **[Play today's clue](https://thecrypticowl.com)** — no account needed.
2. **Use the hints.** They are built to teach the *why*, and using one costs
   you XP rather than locking anything.
3. **[Read the Learn hub](https://thecrypticowl.com/learn)** — five minutes on
   the secret language of indicators pays for itself immediately.
4. **Sign in** to keep your streak across devices.
5. **Come back tomorrow.**

---

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 · TypeScript · Vite |
| Routing | React Router (SPA, code-split per route) |
| Animation | Motion (`motion/react`, via `LazyMotion`) |
| Styling | Tailwind CSS v4 + a token-based theme (`src/app/theme.ts`) |
| Charts | Recharts — lazy-loaded, never fetched until a chart renders |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Generation | AWS Lambda, scheduled daily by EventBridge |
| Hosting | S3 + CloudFront |
| Tests | Vitest — Node and jsdom projects |

Eight runtime dependencies, all of them used.

---

## 💻 Development

**Prerequisites:** Node.js 24+, and a Supabase project for the full experience.
Without Supabase credentials the app runs and serves a built-in practice clue.

```bash
git clone https://github.com/ninadsutrave/thecrypticowl.git
cd thecrypticowl
npm install
cp .env.example .env      # add your Supabase URL and anon key
npm run dev
```

### Checks

`npm run verify` runs exactly what CI runs, across both `src/` and `lambda/`:

```bash
npm run verify          # lint + format + typecheck + test
npm test                # 221 tests across both runtimes
npm run test:watch      # watch mode
npm run test:coverage   # enforces thresholds on the clue validator
```

The clue validator decides what ships as the day's puzzle, so its coverage is
gated in CI — a new wordplay mechanism cannot be merged without tests for it.

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the full workflow, including
how to add a wordplay mechanism end to end.

---

## 📚 Documentation

| Document | What it covers |
|---|---|
| **[Architecture](./docs/architecture.md)** | How the pieces fit together, request and data flow, why the big decisions were made |
| **[Clue pipeline](./docs/clue-pipeline.md)** | How a clue is generated, verified and published — the three gates in detail |
| **[Database](./docs/database.md)** | Schema, the RLS model, and the invariants the app relies on |
| **[Runbook](./docs/runbook.md)** | Today's puzzle is missing. What now? |
| **[AI providers](./docs/ai-providers.md)** | Measured prompt-token costs, free-tier eligibility and quality comparison across the six supported providers |
| **[Supabase setup](./supabase/supabase-setup.md)** | Taking a fresh Supabase project to a working production database |
| **[Roadmap](./docs/roadmap.md)** | Known gaps and what is planned, with honest status |
| **[Contributing](./CONTRIBUTING.md)** | Dev workflow, conventions, and adding a mechanism |

---

## ⚖️ License

Copyright © 2026 [Ninad Sutrave](https://ninadsutrave.com). All rights reserved.
See **[LICENSE](./LICENSE)**. For inquiries, visit
[ninadsutrave.com](https://ninadsutrave.com).
