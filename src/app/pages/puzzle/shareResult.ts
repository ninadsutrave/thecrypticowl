/**
 * The shareable result text.
 *
 * Pulled out of the success screen as a pure function because it is the one
 * piece of copy that leaves the app and lands in someone else's chat window —
 * a wrong emoji row or a stale puzzle number is visible to people who have
 * never used the site. Pure input → string means it can be asserted on
 * exactly, which a JSX-embedded template literal cannot.
 */

export interface ShareInput {
  puzzleNumber: number;
  /** 0–4 */
  hintsUsed: number;
  /** True when the solver revealed the answer instead of solving it. */
  wasRevealed: boolean;
  /**
   * True for the offline fallback clue. It is a real solve, but it has no
   * database row behind it, so there is no streak to claim.
   */
  isPractice?: boolean;
  /** Whole seconds. */
  solveTime: number;
  streak: number;
}

/** 🟩 solved before this hint · 🟨 early hint · 🟥 late hint · 🟫 revealed */
export function shareBlocks(hintsUsed: number, wasRevealed: boolean): string {
  if (wasRevealed) return '🟫🟫🟫🟫';
  return Array.from({ length: 4 }, (_, i) => {
    if (i >= hintsUsed) return '🟩';
    return i < 2 ? '🟨' : '🟥';
  }).join('');
}

/** "45s" under a minute, "2m 05s" above it. */
export function formatSolveTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** The boast line. Tone scales with how much help was needed. */
export function funCallout({
  hintsUsed,
  wasRevealed,
}: Pick<ShareInput, 'hintsUsed' | 'wasRevealed'>) {
  if (wasRevealed) return "Today's clue stumped me — can you crack it without peeking? 🫣";
  if (hintsUsed === 0) return "I cracked today's cryptic with zero hints 🧠 Can you?";
  if (hintsUsed === 1) return "Just 1 hint to crack today's cryptic — your turn 👀";
  if (hintsUsed <= 3) return 'Tricky clue, but I got there! Think you can crack it? 🔍';
  return "Today's cryptic nearly had me — reckon you can solve it? 🤯";
}

export function buildShareText(input: ShareInput): string {
  const { puzzleNumber, hintsUsed, wasRevealed, solveTime, streak, isPractice } = input;

  const scoreLine = wasRevealed
    ? `${shareBlocks(hintsUsed, true)}  (revealed the answer)`
    : `${shareBlocks(hintsUsed, false)}  (${hintsUsed}/4 hints used)`;

  const heading = isPractice
    ? `🦉 TheCrypticOwl — practice clue`
    : `🦉 TheCrypticOwl #${puzzleNumber}`;
  const lines = [heading, ``, scoreLine];

  // A revealed answer has nothing to boast about, and a practice clue has no
  // streak behind it — claiming "0-day streak" is worse than saying nothing.
  if (!wasRevealed && !isPractice) {
    lines.push(`⏱️ ${formatSolveTime(solveTime)}  🔥 ${streak}-day streak`);
  } else if (!wasRevealed) {
    lines.push(`⏱️ ${formatSolveTime(solveTime)}`);
  }

  lines.push(
    ``,
    funCallout({ hintsUsed, wasRevealed }),
    ``,
    `One cryptic clue a day — try it yourself:`,
    `👉 thecrypticowl.com`
  );

  return lines.join('\n');
}

/**
 * Share via the native sheet, falling back to the clipboard.
 *
 * @returns what actually happened, so the UI can show the right confirmation
 *   rather than claiming success when the clipboard was blocked (private
 *   windows, insecure contexts, and older browsers all reject it).
 */
export async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch {
      // User dismissed the sheet, or the platform refused — try the clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
