import {
  Brain,
  Crown,
  Grid3x3,
  Hourglass,
  KeyRound,
  MessageCircleQuestion,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getGame, type GameId } from './registry';

/**
 * One icon family for every game, in place of emoji: emoji render
 * differently on every platform (the chess knight barely at all), so the
 * grid never looked like one designed set.
 */
const ICONS: Record<GameId, LucideIcon> = {
  sudoku: Grid3x3,
  cryptic: Puzzle,
  'what-am-i': MessageCircleQuestion,
  trivia: Brain,
  chronology: Hourglass,
  chess: Crown,
  cryptogram: KeyRound,
};

/** The game's icon in its tinted tile. */
export function GameIcon({ gameId, size = 48 }: { gameId: GameId; size?: number }) {
  const { isDark } = useDarkMode();
  const game = getGame(gameId);
  const Icon = ICONS[gameId];
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: isDark ? `${game.accent}29` : `${game.accent}1A`,
        border: `1.5px solid ${game.accent}${isDark ? '66' : '40'}`,
        color: isDark ? game.accentOnDark : game.accentStrong,
      }}
      aria-hidden
    >
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}
