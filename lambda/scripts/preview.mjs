#!/usr/bin/env node
/**
 * Generate one puzzle locally through a game's real Lambda handler, without
 * touching the database:
 *
 *   node lambda/scripts/preview.mjs sudoku
 *   node lambda/scripts/preview.mjs chess 2026-10-12
 *   GEMINI_API_KEY=… node lambda/scripts/preview.mjs trivia
 *
 * Prints the reviewed (and, where the game has one, judged) payload — the
 * exact JSON the Lambda would store.
 */
const GAMES = ['sudoku', 'what-am-i', 'trivia', 'chronology', 'chess', 'cryptogram'];
const [game, date] = process.argv.slice(2);

if (!GAMES.includes(game)) {
  console.error(`Usage: preview.mjs <${GAMES.join('|')}> [YYYY-MM-DD]`);
  process.exit(2);
}

const { handler } = await import(`../games/${game}/index.js`);
const res = await handler({ preview: true, ...(date ? { date } : {}) });
const body = JSON.parse(res.body);
console.log(JSON.stringify(body, null, 2));
process.exit(res.statusCode === 200 ? 0 : 1);
