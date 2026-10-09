import type { ChronologyEvent } from './sample';

/** For each slot, whether the event in it is where it belongs (earliest first). */
export function correctSlots(order: readonly ChronologyEvent[]): boolean[] {
  const sorted = [...order].sort((a, b) => a.year - b.year);
  return order.map((e, i) => e.id === sorted[i].id);
}

/**
 * Move the event at `index` one step up (-1) or down (+1), hopping over
 * slots already locked as correct. Returns the same array when it can't move.
 */
export function moveEvent<T>(
  order: readonly T[],
  locked: readonly boolean[],
  index: number,
  dir: -1 | 1
): T[] {
  if (locked[index]) return order as T[];
  let j = index + dir;
  while (j >= 0 && j < order.length && locked[j]) j += dir;
  if (j < 0 || j >= order.length) return order as T[];
  const next = [...order];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

/**
 * Drag-and-drop move: take the event at `from` and drop it at `to`, sliding
 * the unlocked events between them along one place. Locked (already correct)
 * slots never move; a drop onto one lands in the nearest unlocked slot
 * towards where the drag came from.
 */
export function moveToSlot<T>(
  order: readonly T[],
  locked: readonly boolean[],
  from: number,
  to: number
): T[] {
  if (locked[from] || from === to) return order as T[];
  const open = order.map((_, i) => i).filter(i => !locked[i]);
  let target = to;
  const step = to > from ? -1 : 1;
  while (target >= 0 && target < order.length && locked[target]) target += step;
  if (target < 0 || target >= order.length || target === from) return order as T[];
  const items = open.map(i => order[i]);
  const fromPos = open.indexOf(from);
  const toPos = open.indexOf(target);
  const [moved] = items.splice(fromPos, 1);
  items.splice(toPos, 0, moved);
  const next = [...order];
  open.forEach((slot, k) => (next[slot] = items[k]));
  return next;
}
