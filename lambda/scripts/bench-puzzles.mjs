#!/usr/bin/env node
/**
 * Compares AI writers on Trivia and What Am I. Every writer gets the same
 * subjects (same seeds), each result goes through the game's real code
 * review, and then one fixed blind solver (BENCH_JUDGE, a model none of the
 * writers is) plays it, exactly as the Lambda's judge does. Nothing is stored.
 *
 *   GEMINI_API_KEY=… GROQ_API_KEY=… node lambda/scripts/bench-puzzles.mjs
 */
import { callGemini } from '../shared/clients/providers/gemini.js';
import { callOpenAICompatible } from '../shared/clients/providers/_openaiCompatible.js';
import { createRng } from '../shared/runtime/random.js';
import { generateTrivia } from '../games/trivia/generator.js';
import { reviewTrivia } from '../games/trivia/reviewer.js';
import { judgeTrivia } from '../games/trivia/judge.js';
import { generateWhatAmI } from '../games/what-am-i/generator.js';
import { reviewWhatAmI } from '../games/what-am-i/reviewer.js';
import { judgeWhatAmI } from '../games/what-am-i/judge.js';

const list = (env, fallback) =>
  (process.env[env] || fallback)
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);

const groq = (model, temperature) => (p, s, sc) =>
  callOpenAICompatible(
    {
      providerLabel: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      model,
      schemaMode: 'json_object',
    },
    p,
    s,
    sc,
    { temperature }
  );

const gemini = (model, temperature) => (p, s, sc) =>
  callGemini(p, s, sc, [model], { temperature, responseMimeType: 'application/json' });

/** "gemini:<model>" or "groq:<model>". */
function client(spec, temperature) {
  const [provider, ...rest] = spec.split(':');
  const model = rest.join(':');
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) return gemini(model, temperature);
  if (provider === 'groq' && process.env.GROQ_API_KEY) return groq(model, temperature);
  return null;
}

const WRITERS = list(
  'BENCH_WRITERS',
  'gemini:gemini-3.5-flash-lite groq:openai/gpt-oss-120b groq:qwen/qwen3.8-27b'
);
const JUDGE = process.env.BENCH_JUDGE || 'groq:qwen/qwen3.8-27b';
const SEEDS = list('BENCH_SEEDS', 'bench-1 bench-2 bench-3');
const DATE = '2026-10-20';

const GAMES = [
  { name: 'trivia', generate: generateTrivia, review: reviewTrivia, judge: judgeTrivia },
  { name: 'what-am-i', generate: generateWhatAmI, review: reviewWhatAmI, judge: judgeWhatAmI },
];

const callJudge = client(JUDGE, 0.1);
if (!callJudge) {
  console.error(`No key for the judge ${JUDGE}.`);
  process.exit(2);
}

function show(game, payload) {
  if (game === 'trivia') {
    console.log(`      Q: ${payload.question}`);
    console.log(`      A: ${payload.answer}   fact: ${payload.fact}`);
  } else {
    payload.clues.forEach((c, i) => console.log(`      ${i + 1}. ${c}`));
    console.log(`      A: ${payload.answer}`);
  }
}

const rows = [];
for (const spec of WRITERS) {
  const callAI = client(spec, 0.7);
  if (!callAI) continue;
  for (const game of GAMES) {
    const row = { writer: spec, game: game.name, passed: 0, review: 0, judge: 0, errors: 0 };
    console.log(`\n━━ ${spec} · ${game.name}`);
    for (const seed of SEEDS) {
      const ctx = {
        date: DATE,
        rng: createRng(`${game.name}:${seed}`),
        used: new Set(),
        usedSince: async () => new Set(),
        callAI,
        callJudge,
        feedback: null,
      };
      try {
        const candidate = await game.generate(ctx);
        console.log(`  ${candidate.summary}${candidate.india ? ' [India]' : ''}`);
        show(game.name, candidate.payload);
        const review = game.review(candidate);
        if (!review.ok) {
          row.review++;
          console.log(`    ✗ code review: ${review.errors.join('; ')}`);
          continue;
        }
        const verdict = await game.judge(candidate, ctx);
        if (!verdict.ok) {
          row.judge++;
          console.log(`    ✗ blind solver: ${verdict.feedback}`);
          continue;
        }
        row.passed++;
        console.log(`    ✓ passed: ${verdict.feedback}`);
      } catch (e) {
        row.errors++;
        console.log(`  ! ${String(e.message).slice(0, 200)}`);
      }
    }
    rows.push(row);
  }
}

console.log(`\n━━ Summary (blind solver: ${JUDGE}; first try, no rewrites)`);
console.log('writer'.padEnd(36) + 'game'.padEnd(11) + 'passed  review✗  solver✗  errors');
for (const r of rows) {
  console.log(
    r.writer.padEnd(36) +
      r.game.padEnd(11) +
      String(r.passed).padEnd(8) +
      String(r.review).padEnd(9) +
      String(r.judge).padEnd(9) +
      r.errors
  );
}
