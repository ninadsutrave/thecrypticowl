# Game lineup

The plan to expand beyond British cryptic clues into a daily puzzle site.
There will be **one new puzzle per game per day**, created by the scheduled
Lambda run.

The guiding rule: **algorithms create and verify the puzzle; the LLM only
writes the words.** Free models are unreliable with facts and with anything
that works letter by letter. Whenever correctness can be checked by code, it
is checked by code. Whenever the LLM writes something, a separate gate checks
it before it ships, the same way the [clue pipeline](./clue-pipeline.md) does
today.

---

## Finalised games

| # | Game | Type | AI calls / day | Source of truth |
|---|---|---|---|---|
| 1 | **Variant Sudoku** | Pure algorithm | 0 | Generator + solver |
| 2 | **British Style Cryptics** | AI + mechanical verification | up to 9 + judge | Existing pipeline |
| 3 | **What Am I Talking About?** | AI, grounded in Wikipedia | ~2–6 | Wikipedia / Wikidata |
| 4 | **Trivia** | AI, grounded in Wikipedia | ~3–9 | Wikipedia (hand-written bank as fallback) |
| 5 | **Chronology** | Factual data feed | 0 (1 optional) | Wikipedia "On this day" |
| 6 | **Chess: Mate in N** | Curated dataset | 0 | Lichess puzzle database |
| 7 | **Cryptogram** | Curated quote pool + algorithm | 0 | Public-domain quotes and proverbs |
| 8 | **Slitherlink** | Pure algorithm | 0 | Generator + solver |
| 9 | **Higher or Lower** | Factual data + algorithm | 0 | Wikidata |

**Status:** all nine are built end to end. Each game has its own Lambda
(`lambda/games/<game>/`) that generates, reviews and judges a medium puzzle
every night, a few days ahead, into `game_puzzles`; the app plays that day's
puzzle and falls back to a labelled practice one only if it's missing. See
[lambdas.md](./lambdas.md) for the pipeline, configuration and deploys.

---

## Difficulty, time and hints (all games)

- **Medium, every day.** Each puzzle should take a typical solver **about
  5–6 minutes**. There is no easy-Monday → hard-Sunday curve; the Sudoku
  variant rotates by weekday, its difficulty does not.
- **Every solve is timed.** The clock counts active time only (it pauses
  while the tab is hidden) and survives a reload. The first finish of the day
  is recorded; replays are practice and never overwrite it.
- **Progress is saved.** Closing the tab mid-puzzle resumes the board, the
  clock, and any hints already used.
- **Every game has a tutorial.** A step-by-step walkthrough with small worked
  examples opens on a player's first visit (the clock waits until it's
  closed) and is one tap away afterwards: the header's Tutorial button, or the
  home card's "How to play" link (`/<game>?tutorial`). The cryptic clue keeps
  its long-form guide at `/learn`. Tutorial examples never use the day's answer.
- **Play history is stored.** Every finish records the date, active time,
  hints, mistakes, result line and game-specific details (e.g. points, checks
  used). It lives on the device for everyone, and in the `game_plays` table
  (migration 003) for signed-in players, merged both ways on sign-in. The
  **My Stats** page (`/stats`) shows streaks, totals, a calendar of puzzles
  finished per day, per-game best and average times, and every play.
- **Hints:**

| Game | Hint | How many |
|---|---|---|
| Variant Sudoku | Reveal the number in the selected (or next empty) cell | Unlimited, counted |
| British Style Cryptics | Step-by-step: definition, indicator, fodder, wordplay | Up to 4, then reveal |
| What Am I? | The answer's first letter and length (costs 1 point) | **One** |
| Trivia | The answer's first letter and word lengths | **One** |
| Chronology | The year of the top unlocked event | **One** |
| Checkmate | Show the next move | One per move, counted |
| Cryptogram | Reveal one letter (the selected one, or the commonest unsolved) | Unlimited, counted |
| Slitherlink | Fix a wrong line, else draw a missing piece of the loop | Unlimited, counted |
| Higher or Lower | A ballpark for the hidden number (one significant figure) | **One** |

Hints used appear in the result line, e.g. "Guess 2 of 3 · hint".

---

### 1. Variant Sudoku

Not standard Sudoku. **Each day of the week has its own variant rule**, so the
game stays fresh. **No AI.**

**Grid size for the 5–6 minute target:** a 9×9 variant with few givens takes
most people 15–30 minutes. Default to **6×6** grids (2×3 boxes), and use 9×9
only with generous givens where testing shows it still lands near six
minutes. The sample is a 6×6 Killer with two givens.

| Day | Variant | Extra rule (on top of normal Sudoku) |
|---|---|---|
| Mon | **Diagonal** or **Anti-knight** | No repeats on either main diagonal / no digit repeats a chess knight's move away. |
| Tue | **Kropki** | White dot: the two digits are consecutive. Black dot: one is double the other. |
| Wed | **Thermo** | Digits rise along each thermometer, starting from the bulb. |
| Thu | **Arrow** | The digits along an arrow add up to the digit in its circle. |
| Fri | **Sandwich** | A number outside the grid gives the sum of the digits between the 1 and the 9 in that row or column. |
| Sat | **Jigsaw** | The 3×3 boxes are replaced by irregular shapes. |
| Sun | **Killer** | Outlined groups of cells add up to the given total, with no repeats within a group. Few or no starting digits. |

**Generation: one engine for all variants**

1. **One solver with pluggable rules.** A backtracking solver with constraint
   propagation. Each variant adds one rule check (group sums, thermometer
   order, arrow sums, dots, sandwich sums, irregular regions). Adding a new
   variant later means writing one more rule, not a new solver.
2. **Generate a full solution grid** that satisfies the day's rule. For Jigsaw,
   first grow random irregular regions, then fill them, and retry if the shape
   can't be filled.
3. **Work the clues out from the solution.** For example: split the grid into
   Killer groups and record their sums; draw thermometers along runs of cells
   that rise; place dots between consecutive or doubled pairs; compute the
   sandwich totals.
4. **Remove starting digits, then extra clues,** one at a time. Keep each
   removal only if the solver still finds **exactly one solution**. Variant
   clues carry a lot of information, so many puzzles end up with very few
   starting digits, or none. That is what makes them interesting.
5. **Grade and pick.** Generate around 50 candidates and keep the one whose
   solve needs the most interesting techniques, not just the hardest one.
   Puzzles made by hand are usually built around one clever opening move;
   generated ones can feel random without this step.

**Gameplay**

- A **rule card with a small worked example** appears before the grid every
  day. Most players won't know the variants.
- Pencil marks, conflict highlighting (including breaches of the variant
  rule), a timer, and limited hints.
- The board is drawn in layers: grid, then group outlines, thermometers,
  arrows, dots and outside clues. Each layer is built once and reused.

The grid, its clues and the solution are stored, so everyone plays the same
puzzle and the archive works.

---

### 2. British Style Cryptics

No change. One British cryptic clue a day, produced by the existing
generate → mechanical verify → judge pipeline. See
[clue-pipeline.md](./clue-pipeline.md).

The only work here is moving it into the shared multi-game structure (see
[Shared architecture](#shared-architecture)).

---

### 3. What Am I Talking About?

The player gets **5 clues about one hidden thing**, revealed one at a time from
vague to specific, and guesses as early as they dare.

**Answer pool:** anything well known, with categories rotated so consecutive
days differ:

- Country / city / landmark
- Celebrity / historical figure
- Festival / holiday / tradition (Diwali, Oktoberfest, Glastonbury)
- Company / brand / product
- Artist / band / musician
- TV show / film / book
- Animal / food / sport / invention / historical event

**Example:** answer *Iceland*

1. I have more sheep than people's patience for my place names.
2. My parliament is often called one of the oldest still in use.
3. I sit on the seam between two tectonic plates.
4. In 2010 one of my volcanoes grounded flights across Europe.
5. I share my name with a British frozen-food chain.

**Gameplay**

- Clue 1 is shown first. The player can guess or reveal the next clue.
- Score: **5 points** for a correct guess on clue 1, down to **1** on clue 5.
  0 if they never get it.
- Free-text guess, matched against the answer **plus its aliases** (Wikidata
  "also known as": *USA*, *United States*, *America*). Matching ignores case
  and accents and allows small typos.
- Wrong guesses don't end the game, but each one uses up the current clue.

**Generation pipeline**

1. **Pick the answer (no AI).** Choose a category by rotation, then a candidate
   from a curated list or a Wikidata query. Skip obscure candidates using
   Wikipedia pageviews, and skip anything already used (same idea as
   `getRecentUsage`).
2. **Fetch facts (no AI).** Get the Wikipedia summary and the Wikidata
   statements and aliases.
3. **Write the clues (1 AI call).** Give the LLM *only* the fetched source text.
   Ask for 5 clues ordered hardest to easiest, each with the source sentence it
   relies on.
4. **Structural gate (free).**
   - No clue contains the answer, any alias, or an obvious part of one (e.g. *Ice*).
   - Exactly 5 clues, single line each, below a length limit.
   - Each cited source sentence really exists in the fetched text.
5. **Blind-solve gate (judge model).** Show the judge clues 1..k for each k and
   ask for its top 3 guesses:
   - Clue 1 alone must **not** give the answer as the top guess (otherwise too easy).
   - All 5 clues together **must** give the answer as the top guess (unique and solvable).
   - Difficulty should rise steadily from clue to clue.
6. On a fail, feed the judge's notes back for a retry, or pick a new answer.
   Use the same budget and fail-fast rules as the cryptic pipeline.

**Living people:** clues about celebrities must be about their work and public
achievements only. Never use health, relationships, legal matters or
controversies. Both the generator prompt and the judge enforce this.

---

### 4. Trivia

**One question a day, told as a short story, answered in free text.** No
options to pick from. Modelled on quiz-night questions: 70–130 words chaining
3–5 surprising facts about one subject (an accidental origin, an odd name, an
unexpected first use) from oblique to telling, ending with a direct question
("Name the product."). Medium-hard: the solver has to connect the facts, not
recall one.

**Gameplay**

- Read the story, type the answer. Three guesses; small typos are forgiven
  (the same matching as What Am I).
- One hint: the answer's first letter and the length of each word, drawn as
  letter slots.
- Give up at any time. At the end: the answer, one more fact, and the
  Wikipedia source.

**Generation pipeline**

1. **Pick the subject (no AI).** From `topics.js`: 323 Wikipedia articles in
   9 categories, chosen for their backstories, none shared with What Am I.
2. **Write the question (1 AI call).** From the article text only, with the
   source sentence for each fact used, a closing fact, and any shorter answer
   the question asks for ("Diesel" for Diesel engine).
3. **Structural gate (free).** Length and sentence count; ends by asking for
   the answer; no multiple-choice pattern; no answer or alias in the text;
   every fact's sentence really in the source.
4. **Blind-solve gate (judge model, 2 calls).** The opening two sentences
   alone must *not* give it away; the full question must, as the judge's
   first guess; rated medium or hard (not easy, not obscure); fair.
5. **Fallback:** a hand-written question from `trivia/bank.js` (10, each
   from its Wikipedia article).

---

### 5. Chronology

The player gets **6 historical events that all happened on today's date** in
different years, and moves them into order from earliest to latest. **No AI.**

**Example (9 October, the sample puzzle)**

- King Sejong's Korean alphabet, Hangul, is published *(1446)*
- The Collegiate School, later Yale University, receives its charter *(1701)*
- The Treaty of Bern founds what is now the Universal Postal Union *(1874)*
- The Washington Monument opens to the public *(1888)*
- John Lennon is born in Liverpool *(1940)*
- Uganda becomes independent from the United Kingdom *(1962)*

**Source:** Wikipedia's "On this day" feed:
`GET https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/{MM}/{DD}`.
It is free, needs no key, and returns `events`, `births`, `deaths` and
`selected`. Each entry has a `year`, a one-line `text`, and linked `pages`
with thumbnails and extracts. The content is **CC BY-SA**, so each event shows
an attribution link to its Wikipedia page.

**Selection (no AI)**

1. Fetch the feed for the puzzle date and combine `selected` and `events`.
   Optionally add a few `births`/`deaths`, written as "X is born" /
   "X dies", for variety.
2. **Filter out:**
   - entries whose text contains a year, a century, or a giveaway phrase such
     as "World War II" when it would make the order obvious;
   - two entries with the same year (ordering must be unambiguous);
   - very grim entries (massacres, terrorist attacks, disasters with deaths),
     using a keyword blocklist so the daily puzzle stays light;
   - obscure entries, using the linked page's pageviews.
3. **Pick 6 events at medium difficulty:** years spread across the centuries,
   plus **two pairs within ~25 years** of each other, so the player needs some
   real knowledge rather than "that sounds medieval".
4. Shuffle the order shown to the player so it is never already sorted.
5. Store a snapshot of the events and their years. The feed can change over
   time, so the archive must not depend on fetching it again.

Optional: one cheap LLM call to rewrite awkward event text into a short,
uniform style. The year is never sent to the model, and the structural gate
still checks the rewrite contains no year.

**Gameplay**

- Drag-and-drop list (with up/down buttons on mobile and for accessibility).
- **3 attempts.** After each submit, events in the correct position lock green;
  the others stay movable.
- At the end, show each event's year, thumbnail, and a link to its Wikipedia
  article. This "learn something" moment is the reward.
- Score by attempts used; shareable grid such as 🟩🟩🟨🟩🟩 per attempt.

---

### 6. Chess: Mate in N

A daily checkmate puzzle: find the forced mate. **No AI, and no engine needed
at runtime.**

**Source:** the [Lichess puzzle database](https://database.lichess.org/#puzzles),
released as **CC0**. It has millions of engine-verified puzzles, each with a
rating, popularity score and theme tags.

**Selection**

- Filter by theme tags `mateIn3`, `mateIn4` and `mateIn5` (forced mates of
  three to five moves), high popularity, and enough plays.
- **Medium = Lichess rating ~1300–1700.** The sample is puzzle J588J (1380,
  mate in 3).
- Import a **curated subset** (a few thousand) into the database instead of the
  full CSV.
- Never repeat a puzzle id.

**Data format note:** each Lichess row's `FEN` is the position *before* the
opponent's move. The first move in `Moves` is the opponent's setup move. The
remaining moves alternate player solution / opponent reply.

**Gameplay**

- The board starts from the player's side. The setup move is animated, then
  the player moves.
- Each player move is checked against the solution line. Any move that also
  mates in one is accepted too, which is the Lichess convention.
- Hint: show the next move (both squares highlighted, plus the move in notation).
- The position is saved after every move, so a reload resumes the line.

**Frontend libraries:** `chess.js` (BSD-2) for move legality, and a board
component under a permissive licence such as `react-chessboard` (MIT).
Avoid `chessground` unless GPL-3.0 is acceptable.

---

### 7. Cryptogram

A well-known quote or proverb in which every letter has been swapped for
another letter. The player works out which letter is which. **No AI at
runtime.**

**Example**

```
RTH GHQ ZD PZOTRZHL RTJQ RTH DUALI.
THE PEN IS MIGHTIER THAN THE SWORD.
```

**Making the daily puzzle (no AI)**

1. **Take the next unused quote** from the curated pool (see below).
2. **Build the cipher.** Generate a random letter-swap key in which no letter
   stands for itself. Keep spaces and punctuation as they are. Encode the
   author's name with the same key as a bonus.
3. **Solvability gate.** Run an automatic solver that scores how English-like
   each attempt is (quadgram frequencies) and improves it step by step. It
   must recover the original text. This proves the text decodes to only one
   answer, and how long the solver takes gives the difficulty grade.
4. **Medium difficulty:** 50–90 letters, a familiar saying, with **2 letters
   revealed** at the start.

**Gameplay**

- Tap a cipher letter, type a guess, and every occurrence fills in.
- Warn when the same guess is used for two different cipher letters.
- Hints reveal one letter each: the selected one if it's wrong, otherwise
  the commonest unsolved letter.
- **View the coded quote**: a popup showing the whole cipher text written out
  as a sentence, the decoding so far beneath it, and how often each code
  letter appears.
- On solving, show the author, the source, and a link (Wikiquote, Gutenberg).

#### Not running out of quotes

At one quote a day, a year uses **365**. The aim is a pool of **2,000+ curated
quotes (5+ years)** before launch, plus steady ways to add more.

**Sources that are free to use:**

| Source | Roughly how many | Notes |
|---|---|---|
| *Bartlett's Familiar Quotations* (1919 edition) | Thousands | Public domain. On Project Gutenberg and Bartleby. |
| **Proverbs and sayings** (Wiktionary's "English proverbs" category, Wikiquote's proverb pages) | Hundreds | Proverbs have no author, so no copyright. Covers the "well-known saying" type. |
| **Wikiquote pages for public-domain authors** (Wilde, Twain, Franklin, Shakespeare, Austen, Dickens, Lincoln, Einstein\*, and more) | Thousands | Use only the **"Sourced"** section. Skip "Attributed", "Disputed" and "Misattributed". |
| Classic collections on Gutenberg: *Poor Richard's Almanack*, *The Devil's Dictionary* (Bierce), La Rochefoucauld's *Maxims*, Aesop's morals, Marcus Aurelius and Confucius in 19th-century translations | Hundreds each | Witty, short, and well suited to cryptograms |

\* *Einstein died in 1955, so he only just qualifies. Churchill died in 1965,
so his words stay in copyright in the UK until 2036. Check each author against
the rule below rather than assuming.*

**Copyright rule for the importer:** take a quote automatically only if the
author **died more than 70 years ago** (before 1956 as of 2026), which is the
UK/EU rule. For translations, the **translator** must meet the same rule.
Proverbs with no author are always fine.

**Keeping the pool healthy**

- **Store the pool in its own table,** `cryptogram_quotes`: text, author,
  source, licence, quality score, `used_on`. The daily run takes the
  best-scoring unused quote and never repeats one.
- **Import once, in bulk,** with a script in `scripts/` that parses the sources
  above, removes duplicates (after normalising case and punctuation), and
  rejects anything unsuitable:
  - 50–150 letters (too short can decode more than one way; too long is a chore);
  - at least ~15 different letters;
  - no names or archaic words that are hard to guess;
  - an offensive-word blocklist.
- **Optional one-off AI review:** a cheap model rates each quote 1–5 for
  "well known / interesting / not dated or offensive". The model only scores;
  it never edits the text, so it can't introduce errors.
- **Check attributions.** For quotes from books, confirm the text actually
  appears in that book's Gutenberg text. Wrongly attributed quotes are very
  common online.
- **Low-stock alert:** the daily run sends an alert through the existing
  alert channel when fewer than **180 unused quotes** remain.
- **The supply grows every year.** Each 1 January, the work of authors who died
  70 years earlier becomes public domain in the UK (Public Domain Day). Every
  January, re-run the importer with the newly eligible authors.
- **Themed weeks** (Shakespeare week, proverbs from around the world) make
  the pool go further and give each week a feel.

---

### 8. Slitherlink

Draw **one closed loop** along the lines of a 6×6 grid of dots. Each number
says how many of its cell's four sides the loop uses. 6×6 gives big cells,
so a stroke follows the finger easily on a small phone; replaced Shikaku in the lineup.

**Gameplay**

- Drag through the dots to draw (drag back to erase a stretch); tap a side to
  cycle line → cross → nothing. Undo, Clear, and a hint that fixes a wrong
  line or draws a missing piece.
- Keyboard: arrows move a cursor dot; Shift + arrow draws or erases.
- Numbers turn red when they have too many lines, fade once exactly met;
  dots turn red where three lines meet. Solved when the lines form one loop
  satisfying every number (there is exactly one).

**Generation (no AI)**

1. **Loop:** grow a random blob of 42–60% of the cells, rejecting any step
   that would leave a hole or make two cells touch only at a corner; the
   blob's outline is then one simple loop.
2. **Clues:** every cell's count, then remove clues, **zeros first** (the most
   generous), keeping a removal only if the solver still finds exactly one
   loop within 12 guesses. Stops at 11 clues.
3. **Judge:** re-solve from the clues and confirm the stored loop.

The solver uses the deductions people do: a met clue closes its other sides;
a dot has 0 or 2 lines; a line may not close a small loop while other lines
exist. In testing, every seed produced a puzzle in about 10 ms.

---

### 9. Higher or Lower

**Five close calls on a daily theme.** Each round shows one thing with its
number and a new one with it hidden: higher or lower? The new one becomes the
next round's known one.

**Themes** (rotating by date, `lambda/games/higher-lower/themes.js`): city
populations (city proper), country areas, mountain heights, river lengths,
building heights, country populations, stadium capacities, lake areas. No
dates: ordering by date is Chronology's job (film years were dropped for
that reason, company founding years because Wikidata's are unreliable).

**Generation (no AI)**

1. **Pool:** one Wikidata SPARQL query per theme, keeping the best-known
   entries (most Wikipedia language editions; 80–150 per theme).
2. **Descriptions:** Wikidata's one-liners, minus numbers ("1995 film by…")
   and any clause with a ranking ("…, the largest in the world by area").
3. **Chain:** six items, five rounds. An up/down pattern with 2–3 ups; then
   a random walk where each step is a **fair pair** (no ties, values within
   a ratio band, e.g. 1.12–1.9× for cities), picks leaning towards the
   best-known entries.
4. Items rest 60 days before returning. A later attempt moves to the next
   theme, in case one query is failing.

**Hint:** once per game, the hidden number to one significant figure.

---

## India focus

Most players are in India. Single-answer games lean Indian on a share of
days (`lambda/shared/runtime/india.js`, drawn from the day's seeded random
number, so reproducible); games with several items include a few Indian
ones every day instead of making a whole day Indian.

| Game | How | What's Indian |
|---|---|---|
| What Am I | 5 days in 8 | The answer, from the day's category's Indian entries (cities, landmarks, companies, films, festivals, historical figures, food…) |
| Trivia | 5 days in 8 | The subject, from the India list (brands, engineering, places, space, culture, food) |
| Cryptogram | 2 days in 10 | An Indian quote: Tagore's *Stray Birds* and *Gitanjali*, Gandhi, Vivekananda, an Indian proverb |
| Higher or Lower | Every day | Two of the six items are Indian where the theme has them (Indian cities, peaks, rivers, stadiums; India itself among countries) |
| Chronology | Every day | One or two of the six events have an Indian link, when the date has one |

When the Indian side of a pool is used up, a game falls back to the rest
rather than going without a puzzle. Sudoku, Slitherlink and Checkmate have
no cultural content to vary.

---

## Shared architecture

These changes are needed regardless of which game ships first.

- **Database:** `game_puzzles` (migration 004), keyed by `(game, puzzle_date)`,
  with the frontend-ready JSONB `payload` and the `source_keys` it was built
  from, so no source repeats. The cryptic tables stay as they are. Lichess
  puzzles come from its API per run and the quote pool ships with the
  cryptogram Lambda, so neither needs its own table.
  Play history is already in place: `game_plays` (migration 003) records every
  game's finishes per user and day, and the My Stats page derives day streaks
  from it. The cryptic `solve_history`/XP system is unchanged.
- **Lambda:** one Lambda per game in `lambda/games/<game>/`, each a
  generator, a code reviewer and (where there's an independent check worth
  making) a judge, run by a shared lifecycle in `lambda/shared/runtime/`.
  Separate functions, schedules, deploys and alerts, so one game failing
  never blocks another. Details in [lambdas.md](./lambdas.md).
- **Frontend:** a home page listing today's games with their completion state.
  One route per game (`/sudoku`, `/cryptic`, …). Past days live in the
  members-only archive at `/archive?game=<id>`: each tile opens
  `/<game>?date=YYYY-MM-DD` (cryptic: `/puzzle/<number>`). Signed-out visitors
  get a sign-in prompt on all of these; archive plays are marked done on the
  device and never count towards streaks or stats.
- **One difficulty:** every game targets medium, about 5–6 minutes. See
  [Difficulty, time and hints](#difficulty-time-and-hints-all-games).
- **Shareable results:** a spoiler-free emoji grid per game (e.g. 🟥🟥🟩⬜⬜ for
  "got it on clue 3").
- **AI budget:** only Cryptic, What Am I and Trivia need a model, plus the
  optional Chronology rewrite. See [Cost analysis](#cost-analysis).

---

## Cost analysis

The cost of producing **all seven puzzles every day, including retries and
validation**. Prices use the Gemini rate card already in
[ai-providers.md](./ai-providers.md): Pro **$1.25 in / $10 out** and Flash
**$0.30 in / $2.50 out** per million tokens. Re-check these before relying on
them.

### Thinking tokens: the hidden cost

Gemini 2.5 models **"think" before answering by default, and thinking is
billed as output tokens**. The lambda doesn't set a `thinkingConfig`, and
[ai-providers.md](./ai-providers.md) doesn't count thinking. Its cryptic
estimate ($0.38/month average) is therefore a **lower bound**.

The figures below assume a typical **~2,000 thinking tokens per Pro call** and
**~1,000 per Flash call**, unless thinking is turned off. The real numbers can
be read from `usageMetadata.thoughtsTokenCount` in each response. Log that
value before trusting any estimate.

### Model choice per game

| Game | Generator | Checker | Thinking |
|---|---|---|---|
| British Style Cryptics | Pro (as today) | Flash | Default (Pro can't disable it) |
| What Am I | **Flash**: rewording facts it is given, so Pro isn't needed | Flash, blind-solve | Generator capped at 1,024; blind-solve **0**, so it guesses like a person would |
| Trivia | **Flash** | Flash, blind-answer | Generator capped at 1,024; checker 0 |
| Chronology (optional rewrite) | Flash | Code (no year in the text) | 0 |

### AI cost per game

**Assumptions**

| Game | Tokens per attempt (in / out incl. thinking) | Attempts per day: average / worst |
|---|---|---|
| Cryptic | per [ai-providers.md](./ai-providers.md), plus thinking | 5 / 15 calls |
| What Am I | Generator 2,500 / 1,300; 2 blind-solve calls 1,000 / 160 | 1.5 / 4 |
| Trivia (one story question) | Generator 3,000 / 1,200; 2 blind-solve calls 800 / 150 | 1.5 / 4, then fall back to the bank |
| Chronology | 600 / 250, one call; if it fails, keep the original text | 1 / 1 |

**Monthly cost (30 days)**

| Game | AI calls/day (avg / worst) | **Avg / month** | **Worst / month** |
|---|---:|---:|---:|
| British Style Cryptics | 5 / 15 | **$2.33** | **$6.98** |
| What Am I | 4.5 / 12 | $0.21 | $0.56 |
| Trivia | 4.5 / 12 | $0.25 | $0.65 |
| Chronology | 1 / 1 | $0.03 | $0.03 |
| Variant Sudoku | 0 | $0 | $0 |
| Chess | 0 | $0 | $0 |
| Cryptogram | 0 | $0 | $0 |
| **Total AI** | **~16 / ~40** | **≈ $3.20** | **≈ $8.90** |

Takeaways:

- **Cryptic is about 80% of the AI bill**, almost entirely because of Pro's
  thinking tokens. Capping Pro's thinking budget (e.g. 1,024), or A/B testing
  Flash as the cryptic generator, would roughly halve the total. Judge the
  result by `judge_score`, not by cost alone.
- The four games that don't call a model each day cost **nothing** in AI.
  That's the payoff of "algorithms create the puzzle".
- Without thinking, the total drops to **~$0.90 average / ~$2.20 worst**.
  That's the floor if every budget is cut to the minimum.

### One-time costs

| Item | Cost |
|---|---|
| Chess: download the Lichess puzzle CSV and filter it locally to a few thousand mate puzzles | $0 |
| Cryptogram: score ~3,000 candidate quotes with Flash (batches of 50, thinking 0), about 180K in / 30K out | **≈ $0.15** |
| Cryptogram: yearly Public Domain Day top-up | a few cents |
| Sudoku: generator and solver development | $0 (engineering time only) |

### Infrastructure

| Component | What the new games add | Cost |
|---|---|---|
| **AWS Lambda** | 7 game runs a day. Variant Sudoku is the heaviest: ~50 candidates × uniqueness checks, roughly 30–120 s at 1 GB. That's at most ~4K GB-s a month. | **$0**. Lambda's always-free tier is 400K GB-s and 1M requests a month. Without it, about $0.06/month. |
| EventBridge, SNS alerts, CloudWatch Logs | A few more log lines and alerts | $0 (within free tiers) |
| **Supabase** | Puzzles: a few KB per game per day, under 10 MB a year. Lichess subset and quote pool: about 1 MB each. | $0 on the free plan (500 MB). The thing that grows is `solve_history` as players are added, not puzzles. Pro ($25/month) is only needed at real user scale. |
| Wikipedia / Wikidata / Wikimedia feeds, pageviews | A handful of requests a day | $0. Send a descriptive `User-Agent`, as Wikimedia's API policy requires. |
| S3 + CloudFront (frontend) | More routes and the Sudoku and chess board code | ~$0. CloudFront's always-free tier (1 TB and 10M requests a month) covers hobby traffic. |

### Free tier vs paid

At **~16 calls a day on average and ~40 at worst** (only up to 9 of them on
Pro), a free Gemini tier may cover it. **Don't depend on it:** Google has cut
free-tier quotas before, and free-tier requests can also be rate-limited at
the worst moment. Plan for paid usage. At **about $3–8 a month for every game
combined**, reliability is worth more than the saving.

### Spending on reliability, not models

Retries are already in the numbers above. These measures make puzzles
reliable for little or no extra cost:

1. **Generate ahead.** Keep a **3–7 day buffer** of validated puzzles for each
   game, and make the daily run top up the buffer instead of producing today's
   puzzle. A provider outage or quota cut then has a week to resolve before
   players notice. Extra cost: **$0**, since it's the same calls made earlier.
2. **A fallback for every AI game.**
   - Trivia → a hand-written bank (`trivia/bank.js`).
   - Chronology → original Wikipedia text.
   - What Am I → a small hand-checked reserve (~30 puzzles).
   - Cryptic → the existing provider fallback.
3. **A second provider for outages.** Mistral (free tier) or DeepSeek
   (~$0.11/month for the cryptic workload) behind the existing `AI_PROVIDER`
   switch. Its only cost is the days it's actually used.
4. **Budget alarms.** Set a Google Cloud billing alert at $10/month, and log
   `usageMetadata` token counts for each run to CloudWatch. A runaway retry
   loop then shows up in a day, not on the invoice.
5. **Separate runs per game.** Sudoku's heavy computing then can't time out
   the AI games (the current Lambda is 256 MB with a 600 s timeout).

**Bottom line:** about **$3 a month on average and under $10 in the worst
case**, almost all of it the cryptic clue's Pro thinking tokens. Every other
game is close to free.

---

## Backlog: candidates for later

Not committed. Listed so the shared design doesn't rule them out.

| Game | Type | Why it fits |
|---|---|---|
| Mini crossword (5×5) | Algorithm fills the grid, LLM writes clues | Reuses the clue pipeline almost directly |
| Word ladder | Pure algorithm (BFS on a dictionary) | Zero AI, easy to build |
| Connections-style groups | LLM + judge | Very popular; red herrings are hard for small models |
| Letter hive (Spelling Bee-style) | Pure algorithm | Needs a good common-word list |
| Nonogram | Pure algorithm | Uniqueness check with a line solver |
| Numbers game (Countdown-style) | Pure algorithm | Solver checks the target can be reached |

**Naming:** *Wordle*, *Connections*, *Spelling Bee* and *KenKen* are
trademarks. Use original names for any game inspired by them.

---

## Open questions

- Should What Am I accept free text only, or switch to multiple choice after
  clue 5 as a last resort?
- Should streaks be per game, overall, or both?
- Should Chronology include births and deaths, or historical events only?
- Monday Sudoku: Diagonal, Anti-knight, or alternate between the two?
- Rollout order. The suggested order puts the cheapest and safest first:
  **Cryptogram → Chess → Chronology → Variant Sudoku → What Am I → Trivia**.
  Variant Sudoku moved later because the variant drawing layers are the
  biggest frontend job.
