#!/usr/bin/env node
/**
 * Generate one puzzle locally through a game's real Lambda handler, without
 * touching the database:
 *
 *   node lambda/scripts/preview.mjs sudoku
 *   node lambda/scripts/preview.mjs chess 2026-10-12
 *   GEMINI_API_KEY=… node lambda/scripts/preview.mjs trivia
 *   GEMINI_API_KEY=… node lambda/scripts/preview.mjs cryptic
 *
 * Prints the reviewed (and, where the game has one, judged) payload — the
 * exact JSON the Lambda would store.
 */
const GAMES = [
  'cryptic',
  'sudoku',
  'what-am-i',
  'trivia',
  'chronology',
  'chess',
  'cryptogram',
  'slitherlink',
  'higher-lower',
];
const [game, date] = process.argv.slice(2);

if (!GAMES.includes(game)) {
  console.error(`Usage: preview.mjs <${GAMES.join('|')}> [YYYY-MM-DD]`);
  process.exit(2);
}

if (game === 'cryptic') {
  // The cryptic Lambda predates the shared handler: run its pipeline
  // directly (no database: variety constraints are skipped).
  const { generateValidClue } = await import('../games/cryptic/pipeline.js');
  const { getAIClient, getJudgeClient } = await import('../shared/clients/aiClient.js');
  const provider = process.env.AI_PROVIDER || 'gemini';
  const judge = process.env.JUDGE_PROVIDER || provider;
  const { lexical, clue, verdict, stats } = await generateValidClue(
    getAIClient(provider),
    getJudgeClient(judge),
    'none'
  );
  console.log(JSON.stringify({ lexical, clue, verdict, stats }, null, 2));
  process.exit(0);
}

// Several dates at once (comma-separated): each one avoids what the earlier
// ones and PREVIEW_USED (comma-separated source keys) already took. Every
// result is also printed on one line after PREVIEW_RESULT, for scripts.
const { handler } = await import(`../games/${game}/index.js`);
const used = (process.env.PREVIEW_USED ?? '').split(',').filter(Boolean);
let failed = false;
for (const d of (date ?? '')
  .split(',')
  .filter(Boolean)
  .concat(date ? [] : [undefined])) {
  const res = await handler({ preview: true, used, ...(d ? { date: d } : {}) });
  const body = JSON.parse(res.body);
  console.log(JSON.stringify(body, null, 2));
  console.log(`PREVIEW_RESULT ${JSON.stringify(body)}`);
  if (res.statusCode === 200) used.push(...(body.sourceKeys ?? []));
  else failed = true;
}
process.exit(failed ? 1 : 0);
