/** Rating band for medium-hard: a real think for club-level players. */
export const RATING_BAND = [1600, 2100];
/** A puzzle this many people have played has had its flaws reported. */
const MIN_PLAYS = 500;

/**
 * Lichess has already proved the line with Stockfish; this judge decides
 * whether it suits *us*: medium rating, and well-tested by real players.
 */
export function judgeChess(candidate) {
  const { source } = candidate.payload;
  const plays = candidate.plays ?? 0;
  if (source.rating < RATING_BAND[0] || source.rating > RATING_BAND[1]) {
    return { ok: false, feedback: `rated ${source.rating}, outside ${RATING_BAND.join('–')}` };
  }
  if (plays < MIN_PLAYS) return { ok: false, feedback: `only ${plays} plays on Lichess` };
  return { ok: true, feedback: `rated ${source.rating}, ${plays} plays`, score: source.rating };
}
