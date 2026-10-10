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

const { handler } = await import(`../games/${game}/index.js`);
const res = await handler({ preview: true, ...(date ? { date } : {}) });
const body = JSON.parse(res.body);
console.log(JSON.stringify(body, null, 2));
process.exit(res.statusCode === 200 ? 0 : 1);
