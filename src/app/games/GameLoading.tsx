import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { getGame, type GameId } from './registry';
import { GameIcon } from './GameIcon';

/** Placeholder while today's puzzle loads, shaped like the game header. */
export function GameLoading({ gameId }: { gameId: GameId }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const game = getGame(gameId);
  const bar = (w: string, h = 14) => (
    <div
      className="rounded-md animate-pulse"
      style={{ width: w, height: h, background: T.inputBg }}
    />
  );
  return (
    <div
      className="max-w-2xl mx-auto px-4 pb-20 pt-6"
      role="status"
      aria-busy="true"
      aria-label={`Loading ${game.name}`}
    >
      <div className="flex items-center gap-3 mt-10 mb-6">
        <GameIcon gameId={gameId} />
        <div className="space-y-2">
          {bar('180px', 20)}
          {bar('120px')}
        </div>
      </div>
      <div className="rounded-3xl animate-pulse" style={{ height: 320, background: T.inputBg }} />
    </div>
  );
}
