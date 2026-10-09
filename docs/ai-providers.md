# AI Providers — Cost & Quality for British Cryptic Generation

This document compares the six AI clients wired into the lambda's
[`getAIClient`](../lambda/shared/clients/aiClient.js) factory: free-tier
availability, paid-tier pricing, and **monthly cost grounded in the actual
prompts, retry budget, and 3-layer architecture** of this pipeline.

---

## TL;DR

| Rank | Provider · Model combo | Avg / month | Worst / month | British cryptic quality | Verdict |
|---|---|---:|---:|---|---|
| 1 | **Gemini 2.5 Pro + Flash** (current default) | **$0.38** | $1.13 | Solid | Stay here. Free tier likely covers it anyway. |
| 2 | **DeepSeek V3 + R1** | $0.11 | $0.32 | Adequate | Cheapest. Use V3 as judge, not generator. |
| 3 | **Claude Sonnet 4.5 + Haiku 4.5** | $0.84 | $2.53 | **Best UK register** | Switch only if you want sharper surfaces. |
| 4 | **GPT-4.1 + GPT-4o-mini** | $0.51 | $1.52 | Good (Americanised) | Best structured-output tooling, prefer as judge. |
| 5 | **GPT-4o + GPT-4o-mini** | $0.63 | $1.89 | Good (Americanised) | Same caveats as 4.1, slightly pricier. |
| 6 | **Mistral Large 2 + Medium 3** | $0.51 | $1.50 | Workmanlike | Mistral free tier (1 RPS) is interesting backup. |
| 7 | **Grok 4 + Grok 3** | $0.92 | ~$2.50 | Average | Skip — no upside for cryptic puzzles. |
| 8 | **Claude Opus 4.x + Haiku 4.5** | $3.90 | $11.72 | Excellent | Overkill for one daily clue. |

These are **per-month total costs for one daily run** of the full pipeline,
including retries.

---

## How the cost is built up

The lambda runs **three distinct AI calls per attempt**, with retries:

1. **Lexical planner** — picks the answer + mechanism. Generator-tier model.
2. **Clue generator** — writes the clue for the chosen lexical. Generator-tier model. Up to **3 retries per lexical** (with judge feedback fed back into the next prompt).
3. **Judge** — separately scores every clue attempt. Judge-tier model (cheaper / faster).

Outer budget: `MAX_ATTEMPTS = 9` total generator calls (lexical + clue
combined). Each clue call also fires one judge call. So per run:

- **Best case** (1st clue accepted): 1 lexical + 1 clue + 1 judge = **3 calls**.
- **Average** (~2nd clue accepted): 1 lexical + 2 clues + 2 judges = **5 calls**.
- **Worst case** (budget fully drained): 3 lexicals + 6 clues + 6 judges = **15 calls**.

### Measured per-call token sizes

Measured directly from `lambda/games/cryptic/constants/prompts.js` on 2026-04-24:

| Call | Input tokens | Output tokens |
|---|---:|---:|
| Lexical planner | ~875 | ~50 |
| Clue generator | ~3,153 | ~106 |
| Judge | ~1,100 | ~41 |

(`tokens ≈ chars / 4`; real tokenisers vary ±15%.)

### Monthly token totals (30 days)

|  | Avg per day | Avg per month | Worst per day | Worst per month |
|---|---:|---:|---:|---:|
| Generator input | 7,181 | **215K** | 21,543 | **646K** |
| Generator output | 262 | **8K** | 786 | **24K** |
| Judge input | 2,200 | **66K** | 6,600 | **198K** |
| Judge output | 82 | **2.5K** | 246 | **7K** |

These four numbers are what every per-provider cost below is computed
against.

---

## Per-provider monthly cost

Pricing as of late-2024 / early-2025; **always re-check the provider's
billing console before flipping `AI_PROVIDER`** for an extended period.

### Gemini 2.5 Pro + Flash *(current default)*

| | Input | Output |
|---|---:|---:|
| Pro | $1.25 / 1M | $10.00 / 1M |
| Flash | $0.30 / 1M | $2.50 / 1M |

| Scenario | Pro cost | Flash cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.349 | $0.026 | **$0.38** |
| Worst month | $1.048 | $0.077 | **$1.13** |

**Free tier:** ~25 RPD on Pro, ~250 RPD on Flash in eligible regions.
Average case (5 calls × 30 days = 150 calls/month split across Pro and
Flash) sits comfortably inside free.

---

### Claude Sonnet 4.5 + Haiku 4.5

| | Input | Output |
|---|---:|---:|
| Sonnet 4.5 | $3.00 / 1M | $15.00 / 1M |
| Haiku 4.5 | $1.00 / 1M | $5.00 / 1M |

| Scenario | Sonnet cost | Haiku cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.765 | $0.079 | **$0.84** |
| Worst month | $2.298 | $0.233 | **$2.53** |

**Free tier:** $5 sign-up credit only. No ongoing free tier.

---

### Claude Opus 4.x + Haiku 4.5

| | Input | Output |
|---|---:|---:|
| Opus 4.x | $15.00 / 1M | $75.00 / 1M |
| Haiku 4.5 | $1.00 / 1M | $5.00 / 1M |

| Scenario | Opus cost | Haiku cost | **Total** |
|---|---:|---:|---:|
| Avg month | $3.825 | $0.079 | **$3.90** |
| Worst month | $11.49 | $0.233 | **$11.72** |

Quality is the highest of any model listed here, but the cost ratio vs
Sonnet 4.5 isn't justifiable for a one-clue-per-day workload. If you ever
need a "publishable in The Times" run, do it manually via the Anthropic
Console rather than via the lambda.

---

### OpenAI GPT-4o + GPT-4o-mini

| | Input | Output |
|---|---:|---:|
| GPT-4o | $2.50 / 1M | $10.00 / 1M |
| GPT-4o-mini | $0.15 / 1M | $0.60 / 1M |

| Scenario | 4o cost | 4o-mini cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.618 | $0.011 | **$0.63** |
| Worst month | $1.855 | $0.034 | **$1.89** |

**Free tier:** $5 trial credit (3 months) on new accounts.

---

### OpenAI GPT-4.1 + GPT-4o-mini

| | Input | Output |
|---|---:|---:|
| GPT-4.1 | $2.00 / 1M | $8.00 / 1M |
| GPT-4o-mini | $0.15 / 1M | $0.60 / 1M |

| Scenario | 4.1 cost | 4o-mini cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.494 | $0.011 | **$0.51** |
| Worst month | $1.484 | $0.034 | **$1.52** |

GPT-4.1 has a 2 M token context window and prompt-caching pricing
($0.50 / 1M for cached input) — useful if you ever pin the long
`CLUE_GENERATOR_SYSTEM` prompt. Could drop costs by another 30–40%.

---

### GPT-5 + GPT-5-mini *(if/when GA — pricing approximate)*

| | Input | Output |
|---|---:|---:|
| GPT-5 | ~$1.25 / 1M | ~$10.00 / 1M |
| GPT-5-mini | ~$0.10 / 1M | ~$0.40 / 1M |

| Scenario | GPT-5 cost | mini cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.349 | $0.008 | **~$0.36** |

Comparable to Gemini Pro on cost; quality TBD until you can run an actual
A/B in your `judge_score` column.

---

### DeepSeek V3 + R1

| | Input | Output |
|---|---:|---:|
| V3 (deepseek-chat) | $0.27 / 1M | $1.10 / 1M |
| R1 (deepseek-reasoner) | $0.55 / 1M | $2.19 / 1M |

| Scenario | V3 cost | R1 cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.067 | $0.041 | **$0.11** |
| Worst month | $0.200 | $0.124 | **$0.32** |

**Off-peak window** (22:30–06:30 UTC) gives ~50% discount → as low as
**~$0.05/month average**. Cheapest viable option for this task by a wide
margin. **No ongoing free tier**, but the unit cost makes that academic.

---

### xAI Grok 4 + Grok 3

| | Input | Output |
|---|---:|---:|
| Grok 4 | ~$3.00 / 1M | ~$15.00 / 1M |
| Grok 3 | ~$2.00 / 1M | ~$10.00 / 1M |

| Scenario | Grok 4 cost | Grok 3 cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.765 | $0.157 | **$0.92** |
| Worst month | ~$2.30 | ~$0.50 | **~$2.50** |

**Free tier:** $25 sign-up credit + bonuses for opting in to data sharing
with X. No ongoing free.

---

### Mistral Large 2 + Medium 3

| | Input | Output |
|---|---:|---:|
| Large 2 | $2.00 / 1M | $6.00 / 1M |
| Medium 3 | $0.40 / 1M | $2.00 / 1M |

| Scenario | Large cost | Medium cost | **Total** |
|---|---:|---:|---:|
| Avg month | $0.478 | $0.031 | **$0.51** |
| Worst month | $1.436 | $0.094 | **$1.50** |

**Free tier:** "La Plateforme" — 1 RPS rate limit, free for low-volume
use. **The lambda fits.** This is the only provider besides Gemini with a
genuine ongoing free tier appropriate for daily generation.

---

## Quality assessment for sophisticated British cryptic clues

The pricing above is moot if a model can't produce solvable, tricky,
British-styled cryptics. Honest take:

| Provider | UK literary register | Ximenean rule-following | Wordplay precision | Misdirection sharpness |
|---|---|---|---|---|
| **Claude Sonnet 4.5** | Excellent | Excellent | Strong | **Strongest** |
| **Claude Opus 4.x** | Excellent | Excellent | Excellent | **Strongest** |
| **Gemini 2.5 Pro** | Good | Strong | Strong | Solid |
| **GPT-4.1 / GPT-5** | Adequate (American) | Strong | **Strongest** | Good |
| **GPT-4o** | Adequate (American) | Strong | Strong | Good |
| **DeepSeek R1** (judge) | Weak | Strong | **Strongest** (chain-of-thought) | Adequate |
| **DeepSeek V3** | Weak | Adequate | Adequate | Prosaic |
| **Mistral Large** | Adequate | Adequate | Adequate | Workmanlike |
| **Grok 4** | Adequate | Adequate | Adequate | Average |

Notes:
- "UK literary register" is the soft thing — does the model say "rubbish"
  or "trash"? "lift" or "elevator"? You'll see this in the surface text
  more than anywhere else.
- "Misdirection sharpness" is the hardest to fake. Claude reliably writes
  surfaces where you're misled then delighted; Gemini is solid; OpenAI is
  mechanically correct but rarely dazzling; DeepSeek and Grok read like
  textbook examples.

---

## Recommended setups for this hobby project

### A — Stay on Gemini *(zero migration risk)*

```
AI_PROVIDER=gemini
```
**~$0.38/month avg, ~$1.13/month worst.** Likely $0 within free tier in
most regions. Today's prompts are tuned for it. No code changes.

### B — A/B Claude Sonnet for sharper surfaces

```
AI_PROVIDER=claude
ANTHROPIC_API_KEY=...
```
**~$0.84/month avg, ~$2.53/month worst.** Best surfaces among all models.
Anthropic's $5 sign-up credit covers ~6 months of average-case runs for
free.

### C — Cheapest path

```
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
```
**~$0.11/month avg, ~$0.32/month worst.** Half off in their off-peak
window. Useable but surfaces feel mechanical. Run as an experiment, not as
your daily driver.

### D — Dual-vendor split *(quality + independence)*

Generator: Claude Sonnet 4.5. Judge: stay on Gemini Flash (current
default in [`judge.js`](../lambda/games/cryptic/validator/judge.js)). Different
model families means the judge is less likely to rubber-stamp the
generator's specific style biases.

**~$0.81/month avg** (Sonnet generator $0.765 + Flash judge $0.026 +
Sonnet lexical $0.014).

---

## My recommendation

**Stay on Gemini Pro + Flash.** It costs less than $1/month even in worst
case, the prompts are tuned for it, and the average run lands inside free
tier on most accounts.

**Run a 14-day Claude Sonnet A/B** if the daily clues feel pedestrian. Set
`AI_PROVIDER=claude` for two weeks, then compare:

```sql
SELECT date, primary_type, judge_score, judge_surface_quality
FROM clues
WHERE date > NOW() - INTERVAL '28 days'
ORDER BY date DESC;
```

If Claude's `judge_surface_quality` median is consistently 4 vs Gemini's
3, the +$0.50/month is worth it. If they tie, go back to Gemini.

The lambda's [preflight gate](../lambda/games/cryptic/index.js) **soft-falls-back to
Gemini** if you ever forget the new provider's API key — so the
experiment can never break daily generation.

---

## Cost summary at a glance

(Average and worst-case **per-month total**, generator + judge combined.)

| Provider combination | Avg | Worst | Free tier covers daily run? |
|---|---:|---:|---|
| **Gemini 2.5 Pro + Flash** | **$0.38** | $1.13 | ✓ (most regions) |
| **DeepSeek V3 + R1** | $0.11 | $0.32 | — (cost is so low it doesn't matter) |
| **GPT-5 + GPT-5-mini** | ~$0.36 | ~$1.10 | $5 trial only |
| **GPT-4.1 + GPT-4o-mini** | $0.51 | $1.52 | $5 trial only |
| **Mistral Large 2 + Medium 3** | $0.51 | $1.50 | ✓ (1 RPS free tier) |
| **GPT-4o + GPT-4o-mini** | $0.63 | $1.89 | $5 trial only |
| **Claude Sonnet 4.5 + Haiku 4.5** | $0.84 | $2.53 | $5 trial only |
| **Grok 4 + Grok 3** | $0.92 | ~$2.50 | $25 trial only |
| **Claude Opus 4.x + Haiku 4.5** | $3.90 | $11.72 | $5 trial only |

For a one-clue-per-day hobby project, **the entire spectrum costs less
than a single coffee per month**. Choose on quality, not price.

---

## Methodology notes

- **Prompt sizes** measured directly from `lambda/games/cryptic/constants/prompts.js`.
  If you extend the system prompt (more examples, more rules), recalculate
  by re-running the measurement. The script is reproducible from
  [`scripts/build-gemini-payloads.mjs`](../scripts/build-gemini-payloads.mjs).
- **Average call count** assumes ~2nd clue typically passes the judge
  (1 lex + 2 clue + 2 judge = 5 calls). Adjust if your `judge_score`
  distribution shows a different real-world pattern.
- **Worst case** is the full `MAX_ATTEMPTS=9` budget burned, which
  produces 15 API calls (3 lex + 6 clue + 6 judge). Pipeline rarely hits
  this; quota-exhausted exit and judge-unavailable bail-out drop the cap
  even lower in failure modes.
- **Pricing snapshots** are public rate cards as of late-2024/early-2025
  and will drift. The **shape** of the cost ranking — Gemini ≈ DeepSeek
  cheapest, Claude/GPT mid, Opus/Grok highest — is more durable than the
  individual numbers.
- **British-cryptic quality assessments** are subjective. The
  `clues.judge_score` and `clues.judge_surface_quality` columns give
  you the per-clue data needed to falsify any claim above with your own
  A/B.
