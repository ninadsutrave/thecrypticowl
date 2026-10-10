import { StoreKeys, readRaw, writeRaw } from '../../lib/localStore';

export const IDEA_MIN = 10;
export const IDEA_MAX = 600;
export const NAME_MAX = 60;
/** One suggestion a minute per device: a nudge against repeat-clicking. */
const COOLDOWN_MS = 60_000;

/** Why a suggestion can't be sent yet, or null when it can. */
export function suggestionProblem(idea: string, name: string): string | null {
  const text = idea.trim();
  if (text.length < IDEA_MIN) return `Tell us a little more (at least ${IDEA_MIN} characters).`;
  if (text.length > IDEA_MAX) return `Please keep it under ${IDEA_MAX} characters.`;
  if (name.trim().length > NAME_MAX) return `Names can be up to ${NAME_MAX} characters.`;
  return null;
}

export function secondsUntilNext(now = Date.now()): number {
  const last = Number(readRaw(StoreKeys.suggestionAt) ?? 0);
  return Math.max(0, Math.ceil((last + COOLDOWN_MS - now) / 1000));
}

export function markSent(now = Date.now()) {
  writeRaw(StoreKeys.suggestionAt, String(now));
}
