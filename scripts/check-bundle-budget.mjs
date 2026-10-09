#!/usr/bin/env node
/**
 * Bundle budget.
 *
 * Everything a first-time visitor downloads before they can solve the daily
 * clue is on the critical path; everything else is lazy and only matters to
 * the people who navigate there. The budget separates the two, so a heavy
 * dependency added to the Progress page can't quietly inflate the landing
 * experience — and so nobody has to remember to check.
 *
 * Sizes are gzipped, which is what actually crosses the network.
 *
 * Raising a budget is fine when the weight buys something. Doing it silently
 * is not: the diff shows the number changing.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';

/**
 * Chunks fetched before first paint: whatever index.html actually loads —
 * its entry script and every modulepreload. Read from the built HTML rather
 * than guessed from chunk names, so a heavy chunk that sneaks onto the
 * critical path (Recharts once did, via a shared react-dom) fails the
 * budget instead of being reported as lazy.
 */
function criticalChunks(html) {
  const refs = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map(m => m[1]);
  return new Set(refs);
}

const BUDGETS_KB = {
  /** index.html, which carries the inlined CSS. */
  html: 40,
  /** Sum of every critical-path JS chunk, gzipped. */
  criticalJs: 110,
  /** Any single lazy chunk. Recharts lives behind a dynamic import. */
  lazyChunk: 200,
};

if (!existsSync(DIST)) {
  console.error(`No ${DIST}/ directory — run \`npm run build\` first.`);
  process.exit(1);
}

const gzipKb = path => gzipSync(readFileSync(path)).length / 1024;
const fmt = n => `${n.toFixed(1)} KB`;

const assetsDir = join(DIST, 'assets');
const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));

const failures = [];
const report = [];

// ── index.html ───────────────────────────────────────────────────────────────
const htmlKb = gzipKb(join(DIST, 'index.html'));
report.push(['index.html', htmlKb, BUDGETS_KB.html]);
if (htmlKb > BUDGETS_KB.html) {
  failures.push(`index.html is ${fmt(htmlKb)} gzipped, over the ${BUDGETS_KB.html} KB budget.`);
}

// ── Critical path ────────────────────────────────────────────────────────────
const critical = criticalChunks(readFileSync(join(DIST, 'index.html'), 'utf8'));
const criticalFiles = jsFiles.filter(f => critical.has(f));
const criticalKb = criticalFiles.reduce((sum, f) => sum + gzipKb(join(assetsDir, f)), 0);
report.push([`critical JS (${criticalFiles.length} chunks)`, criticalKb, BUDGETS_KB.criticalJs]);
if (criticalKb > BUDGETS_KB.criticalJs) {
  failures.push(
    `Critical-path JS is ${fmt(criticalKb)} gzipped, over the ${BUDGETS_KB.criticalJs} KB budget.\n` +
      `  Chunks: ${criticalFiles.join(', ')}`
  );
}

// ── Lazy chunks ──────────────────────────────────────────────────────────────
for (const f of jsFiles) {
  if (criticalFiles.includes(f)) continue;
  const kb = gzipKb(join(assetsDir, f));
  report.push([`  ${f}`, kb, BUDGETS_KB.lazyChunk]);
  if (kb > BUDGETS_KB.lazyChunk) {
    failures.push(
      `Lazy chunk ${f} is ${fmt(kb)} gzipped, over the ${BUDGETS_KB.lazyChunk} KB budget.`
    );
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const width = Math.max(...report.map(([label]) => label.length));
console.log('\nBundle budget (gzipped)\n');
for (const [label, kb, budget] of report) {
  const mark = kb > budget ? '✗' : '✓';
  console.log(`  ${mark} ${label.padEnd(width)}  ${fmt(kb).padStart(9)}  / ${budget} KB`);
}
console.log('');

if (failures.length > 0) {
  for (const f of failures) console.error(`::error::${f}`);
  process.exit(1);
}
console.log('All budgets met.\n');
