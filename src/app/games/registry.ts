/**
 * The daily puzzle lineup — one entry per game, in home-grid order.
 *
 * Everything that lists, links to or labels a game reads from here, so adding
 * a game is one entry plus its route. Product decisions behind each game live
 * in docs/games.md.
 */

export type GameId =
  | 'sudoku'
  | 'cryptic'
  | 'what-am-i'
  | 'trivia'
  | 'chronology'
  | 'chess'
  | 'cryptogram'
  | 'slitherlink'
  | 'higher-lower';

export interface GameMeta {
  id: GameId;
  name: string;
  path: string;
  emoji: string;
  /** One or two lines for the home grid card. */
  blurb: string;
  /** Decorative accent: tints, borders, progress segments. */
  accent: string;
  /** Accent for text and filled buttons on light surfaces (≥ 4.5:1 with white). */
  accentStrong: string;
  /** Accent for text on dark surfaces (≥ 4.5:1 on the dark card). */
  accentOnDark: string;
}

export const GAMES: readonly GameMeta[] = [
  {
    id: 'sudoku',
    name: 'Variant Sudoku',
    path: '/sudoku',
    emoji: '🔢',
    blurb: 'Sudoku with a twist: a new extra rule every day, from Kropki dots to Killer cages.',
    accent: '#0EA5E9',
    accentStrong: '#0369A1',
    accentOnDark: '#7DD3FC',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    path: '/trivia',
    emoji: '🧠',
    blurb:
      'One question told as a short story. Connect the clues and type the answer: no options to pick from.',
    accent: '#10B981',
    accentStrong: '#047857',
    accentOnDark: '#6EE7B7',
  },
  {
    id: 'what-am-i',
    name: 'What Am I?',
    path: '/what-am-i',
    emoji: '🕵️',
    blurb:
      'Five clues, from vague to obvious. Name the country, celebrity, band or brand in as few as you can.',
    accent: '#F97316',
    accentStrong: '#C2410C',
    accentOnDark: '#FDBA74',
  },
  {
    id: 'chess',
    name: 'Checkmate',
    path: '/chess',
    emoji: '♞',
    blurb: 'Find the checkmate from a real game position. Every move has to be the best one.',
    accent: '#64748B',
    accentStrong: '#334155',
    accentOnDark: '#CBD5E1',
  },
  {
    id: 'chronology',
    name: 'Chronology',
    path: '/chronology',
    emoji: '⏳',
    blurb:
      "Six moments in history that all happened on today's date. Put them in order, earliest first.",
    accent: '#D97706',
    accentStrong: '#B45309',
    accentOnDark: '#FCD34D',
  },
  {
    id: 'cryptic',
    name: 'British Style Cryptics',
    path: '/cryptic',
    emoji: '🧩',
    blurb:
      'One British cryptic crossword clue. The definition is in there somewhere; the rest is wordplay.',
    accent: '#7C3AED',
    accentStrong: '#6D28D9',
    accentOnDark: '#C4B5FD',
  },
  {
    id: 'higher-lower',
    name: 'Higher or Lower',
    path: '/higher-lower',
    emoji: '↕️',
    blurb: 'Bigger city? Taller tower? Fuller stadium? Five close calls, one theme a day.',
    accent: '#14B8A6',
    accentStrong: '#0F766E',
    accentOnDark: '#5EEAD4',
  },
  {
    id: 'slitherlink',
    name: 'Slitherlink',
    path: '/slitherlink',
    emoji: '➰',
    blurb:
      'Draw one loop along the dotted lines. Each number says how many of its four sides the loop uses.',
    accent: '#6366F1',
    accentStrong: '#4338CA',
    accentOnDark: '#A5B4FC',
  },
  {
    id: 'cryptogram',
    name: 'Cryptogram',
    path: '/cryptogram',
    emoji: '🔐',
    blurb: 'A famous saying in disguise: every letter swapped for another. Crack the code.',
    accent: '#EC4899',
    accentStrong: '#BE185D',
    accentOnDark: '#F9A8D4',
  },
];

export function getGame(id: GameId): GameMeta {
  const game = GAMES.find(g => g.id === id);
  if (!game) throw new Error(`Unknown game: ${id}`);
  return game;
}
