import type { HigherLowerPuzzle, ValueFormat } from './sample';

const UNIT: Partial<Record<ValueFormat, string>> = {
  area: ' km²',
  metres: ' m',
  kilometres: ' km',
};

/** Three significant figures, written out: "13.9 million", "468,000", "1.43 billion". */
function count(v: number): string {
  if (v >= 1e12) return `${Number((v / 1e12).toPrecision(3))} trillion`;
  if (v >= 1e9) return `${Number((v / 1e9).toPrecision(3))} billion`;
  if (v >= 1e6) return `${Number((v / 1e6).toPrecision(3))} million`;
  return Number(v.toPrecision(3)).toLocaleString('en-GB');
}

export function formatValue(v: number, format: ValueFormat): string {
  if (format === 'count') return count(v);
  if (format === 'usd') return `$${count(v)}`;
  // Indian box office is reported in crore (10 million rupees).
  if (format === 'inr') {
    const crore = v / 1e7;
    const shown = crore >= 100 ? Math.round(crore) : Number(crore.toPrecision(3));
    return `₹${shown.toLocaleString('en-IN')} crore`;
  }
  if (format === 'years') return `${Math.round(v)} years`;
  const rounded = v >= 100 ? Math.round(v) : Number(v.toPrecision(3));
  return `${rounded.toLocaleString('en-GB')}${UNIT[format]}`;
}

/** Round i asks whether item i + 1 is higher than item i. */
export const isHigher = (puzzle: HigherLowerPuzzle, round: number) =>
  puzzle.items[round + 1].value > puzzle.items[round].value;

export const rounds = (puzzle: HigherLowerPuzzle) => puzzle.items.length - 1;

/**
 * The hint: a ballpark for the hidden value, to one significant figure
 * ("about 10 million", "about 3,000 m"). Close pairs mean it narrows the
 * answer without always settling it.
 */
export function ballpark(v: number, format: ValueFormat): string {
  const magnitude = 10 ** Math.floor(Math.log10(v));
  return `about ${formatValue(Math.round(v / magnitude) * magnitude, format)}`;
}

/** 🟩 for each right call, 🟥 for each wrong one, in order. */
export const roundsGrid = (results: boolean[]) => results.map(r => (r ? '🟩' : '🟥')).join('');
