# Documentation

Start with **[Architecture](./architecture.md)** for the shape of the system,
or the **[Runbook](./runbook.md)** if something is broken right now.

## Reference

| Document | Read it when |
|---|---|
| **[Architecture](./architecture.md)** | You want the system map — how the SPA, the Lambda and the database relate, and why the big decisions were made |
| **[Clue pipeline](./clue-pipeline.md)** | You're working on clue generation or validation. The three gates, the mechanism verifiers, and what "verified" actually means |
| **[Database](./database.md)** | You're touching the schema. Tables, the RLS model, the invariants the app depends on, and the known gaps |
| **[Runbook](./runbook.md)** | The puzzle is missing, a deploy broke something, or an alert fired |
| **[AI providers](./ai-providers.md)** | You're choosing or adding a provider. Measured token costs, free-tier limits, and quality for British cryptic generation |
| **[Roadmap](./roadmap.md)** | You want to know what's knowingly unfinished |
| **[Puzzle Lambdas](./lambdas.md)** | You're working on puzzle generation for any game: the per-game Lambdas, their generate → review → judge lifecycle, configuration, deploys and supply |
| **[Game lineup](./games.md)** | You're working on the multi-game expansion — the finalised games, how each is generated and validated, and the shared design |

## Elsewhere in the repo

| Document | Covers |
|---|---|
| **[../README.md](../README.md)** | Product overview and quick start |
| **[../CONTRIBUTING.md](../CONTRIBUTING.md)** | Dev workflow, conventions, and adding a wordplay mechanism end to end |
| **[../supabase/supabase-setup.md](../supabase/supabase-setup.md)** | Taking a fresh Supabase project to a working production database |

## Assets

- **[`screenshots/`](./screenshots)** — captures used in the top-level README.
