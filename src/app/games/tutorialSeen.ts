import { StoreKeys, readJSON, writeJSON } from '../lib/localStore';
import type { GameId } from './registry';

/**
 * Which games' tutorials this device has seen. A game opens its tutorial on
 * the first visit only; after that it is one tap away in the header.
 */
export function hasSeenTutorial(game: GameId): boolean {
  return readJSON<string[]>(StoreKeys.tutorialsSeen, []).includes(game);
}

export function markTutorialSeen(game: GameId): void {
  const seen = readJSON<string[]>(StoreKeys.tutorialsSeen, []);
  if (!seen.includes(game)) writeJSON(StoreKeys.tutorialsSeen, [...seen, game]);
}
