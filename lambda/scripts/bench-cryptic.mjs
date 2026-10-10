#!/usr/bin/env node
/**
 * Compares AI models at the two things a cryptic setter needs:
 *
 *   1. Letter skills: reversing, anagram checks, hidden words. Exact answers,
 *      scored in code.
 *   2. Clue writing: the real cryptic prompt for fixed answers whose wordplay
 *      is known to work, each result checked by the same code the Lambda uses.
 *
 * Each provider runs only when its key is set; nothing is stored.
 *
 *   GEMINI_API_KEY=… node lambda/scripts/bench-cryptic.mjs
 *   GROQ_API_KEY=… BENCH_GROQ_MODELS="openai/gpt-oss-120b" node lambda/scripts/bench-cryptic.mjs
 */
import { callGemini } from '../shared/clients/providers/gemini.js';
import { callOpenAICompatible } from '../shared/clients/providers/_openaiCompatible.js';
import { generateClue } from '../games/cryptic/generator/clueGenerator.js';
import { verifyMechanism, letters } from '../games/cryptic/validator/mechanics.js';

const list = (env, fallback) =>
  (process.env[env] || fallback)
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);

const OPENAI_STYLE = [
  {
    name: 'groq',
    key: 'GROQ_API_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: list('BENCH_GROQ_MODELS', 'openai/gpt-oss-120b llama-3.3-70b-versatile qwen/qwen3-32b'),
  },
  {
    name: 'cerebras',
    key: 'CEREBRAS_API_KEY',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    models: list('BENCH_CEREBRAS_MODELS', 'gpt-oss-120b qwen-3-235b-a22b-instruct-2507'),
  },
  {
    name: 'openrouter',
    key: 'OPENROUTER_API_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: list('BENCH_OPENROUTER_MODELS', 'deepseek/deepseek-chat-v3-0324:free'),
  },
  {
    name: 'mistral',
    key: 'MISTRAL_API_KEY',
    url: 'https://api.mistral.ai/v1/chat/completions',
    models: list('BENCH_MISTRAL_MODELS', 'mistral-large-latest magistral-medium-latest'),
  },
];

const GEMINI = list(
  'BENCH_GEMINI_MODELS',
  'gemini-3.1-pro-preview gemini-flash-latest gemini-3-flash-preview gemini-3.6-flash gemini-3.5-flash-lite'
);

const CONFIG = { temperature: 0.7, responseMimeType: 'application/json' };
const TIMEOUT_MS = 150_000;

function withTimeout(promise) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, rej) => {
      t = setTimeout(() => rej(new Error('timed out')), TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(t));
}

/** Every model as `{ label, call(prompt, system, schema) }`. */
function contenders() {
  const out = [];
  if (process.env.GEMINI_API_KEY) {
    for (const m of GEMINI) {
      out.push({ label: m, call: (p, s, sc) => callGemini(p, s, sc, [m], CONFIG) });
    }
  }
  for (const prov of OPENAI_STYLE) {
    const apiKey = process.env[prov.key];
    if (!apiKey) continue;
    for (const m of prov.models) {
      out.push({
        label: `${prov.name}:${m}`,
        call: (p, s, sc) =>
          callOpenAICompatible(
            {
              providerLabel: prov.name,
              baseUrl: prov.url,
              apiKey,
              model: m,
              schemaMode: 'json_object',
            },
            p,
            s,
            sc,
            { temperature: 0.7 }
          ),
      });
    }
  }
  return out;
}

// ── 1. Letter skills ────────────────────────────────────────────────────────

const QUIZ = [
  { q: 'Write PLASTER backwards.', a: 'RETSALP' },
  { q: 'Write the word STRESSED backwards.', a: 'DESSERTS' },
  { q: 'Does MELON use exactly the letters of LEMON? Answer YES or NO.', a: 'YES' },
  { q: 'Does "GREAT RUIN" use exactly the letters of TRIANGLE? Answer YES or NO.', a: 'NO' },
  {
    q: 'Which 7-letter animal is hidden, letters consecutive, in "laser pentagram"?',
    a: 'SERPENT',
  },
  {
    q: 'Take the first letters of "Some People Enjoy Awfully Rich". What word do they spell?',
    a: 'SPEAR',
  },
  { q: 'Put CAR inside SE (S, then CAR, then E). What word results?', a: 'SCARE' },
  { q: 'How many letters are in BOOKKEEPER?', a: '10' },
];

const QUIZ_SCHEMA = {
  type: 'OBJECT',
  properties: { answers: { type: 'ARRAY', items: { type: 'STRING' } } },
  required: ['answers'],
};

async function quiz(c) {
  const prompt =
    'Answer each question with just the answer, in order, as JSON {"answers": [...]}.\n\n' +
    QUIZ.map((x, i) => `${i + 1}. ${x.q}`).join('\n');
  const res = await withTimeout(c.call(prompt, 'You answer precisely.', QUIZ_SCHEMA));
  const answers = Array.isArray(res?.answers) ? res.answers : [];
  return QUIZ.map(
    (x, i) => letters(answers[i]) === letters(x.a) || String(answers[i]).trim() === x.a
  );
}

// ── 2. Clue writing ─────────────────────────────────────────────────────────

const TASKS = [
  { answer: 'STRAP', type: 'reversal', definition: 'Belt' },
  { answer: 'SCARE', type: 'container', definition: 'Frighten' },
  { answer: 'PIGEON', type: 'charade', definition: 'Bird' },
  { answer: 'RANCH', type: 'deletion', definition: 'Farm' },
  { answer: 'TENOR', type: 'hidden', definition: 'Singer' },
  { answer: 'MANGO', type: 'anagram', definition: 'Fruit' },
];

async function writeClue(c, task) {
  const clue = await withTimeout(generateClue({ ...task, difficulty: 'medium' }, c.call));
  const verdict = verifyMechanism(task.type, clue, task.answer);
  return { clue, verdict };
}

// ── Run ─────────────────────────────────────────────────────────────────────

const models = contenders();
if (models.length === 0) {
  console.error('No API keys set — nothing to compare.');
  process.exit(2);
}

const rows = [];
for (const c of models) {
  console.log(`\n━━ ${c.label}`);
  const row = { model: c.label, quiz: '—', clues: 0, refuted: 0, failed: 0, secs: 0 };
  const started = Date.now();
  try {
    const marks = await quiz(c);
    row.quiz = `${marks.filter(Boolean).length}/${QUIZ.length}`;
    console.log(`  letter quiz ${row.quiz}  ${marks.map(m => (m ? '✓' : '✗')).join(' ')}`);
  } catch (e) {
    console.log(`  letter quiz failed: ${String(e.message).slice(0, 160)}`);
    if (/quota|limit: 0|billing|404|not found|no longer/i.test(e.message)) {
      row.quiz = 'n/a';
      rows.push(row);
      continue;
    }
  }
  for (const task of TASKS) {
    try {
      const { clue, verdict } = await writeClue(c, task);
      const mark = verdict.status === 'refuted' ? '✗' : '✓';
      if (verdict.status === 'refuted') row.refuted++;
      else row.clues++;
      const pieces = (clue.letter_pieces ?? []).map(p => `${p.clue_words}→${p.letters}`).join(', ');
      console.log(`  ${mark} ${task.answer} (${task.type}): ${clue.clue}`);
      console.log(`      ${clue.wordplay_summary}${pieces ? `  [${pieces}]` : ''}`);
      if (verdict.status === 'refuted') console.log(`      code: ${verdict.detail}`);
    } catch (e) {
      row.failed++;
      console.log(`  ! ${task.answer}: ${String(e.message).slice(0, 160)}`);
    }
  }
  row.secs = Math.round((Date.now() - started) / 1000);
  rows.push(row);
}

console.log('\n━━ Summary (clues: passed the code check / refuted / errored)');
console.log('model'.padEnd(52) + 'quiz   clues  refuted  errors  secs');
for (const r of rows) {
  console.log(
    r.model.padEnd(52) +
      String(r.quiz).padEnd(7) +
      String(r.clues).padEnd(7) +
      String(r.refuted).padEnd(9) +
      String(r.failed).padEnd(8) +
      r.secs
  );
}
