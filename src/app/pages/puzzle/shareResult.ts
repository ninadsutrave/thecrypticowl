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
  /** 0–4 */
  hintsUsed: number;
  /** True when the solver revealed the answer instead of solving it. */
  wasRevealed: boolean;
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
