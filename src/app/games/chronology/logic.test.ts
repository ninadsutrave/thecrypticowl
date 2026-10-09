import { describe, expect, it } from 'vitest';
import { correctSlots, moveEvent, moveToSlot } from './logic';
import { SAMPLE_CHRONOLOGY } from './sample';

const ev = (id: string, year: number) => ({ id, year, text: id, url: '' });

describe('correctSlots', () => {
  it('marks only the events already in chronological position', () => {
    const order = [ev('a', 1900), ev('c', 2000), ev('b', 1950)];
    expect(correctSlots(order)).toEqual([true, false, false]);
  });

  it('starts the sample with nothing in place, so no slot is a freebie', () => {
    expect(correctSlots(SAMPLE_CHRONOLOGY.events).some(Boolean)).toBe(false);
  });

  it('gives every sample event a distinct year, so the order is unambiguous', () => {
    const years = SAMPLE_CHRONOLOGY.events.map(e => e.year);
    expect(new Set(years).size).toBe(years.length);
  });
});

describe('moveEvent', () => {
  it('swaps with the neighbour', () => {
    expect(moveEvent(['a', 'b', 'c'], [false, false, false], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('hops over locked slots', () => {
    expect(moveEvent(['a', 'b', 'c'], [false, true, false], 0, 1)).toEqual(['c', 'b', 'a']);
  });

  it('refuses to move a locked event or off the end', () => {
    const order = ['a', 'b'];
    expect(moveEvent(order, [true, false], 0, 1)).toBe(order);
    expect(moveEvent(order, [false, false], 0, -1)).toBe(order);
  });
});

describe('moveToSlot', () => {
  const free = [false, false, false, false];

  it('moves an item down, sliding the rest up', () => {
    expect(moveToSlot(['a', 'b', 'c', 'd'], free, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item up, sliding the rest down', () => {
    expect(moveToSlot(['a', 'b', 'c', 'd'], free, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('never moves locked slots', () => {
    expect(moveToSlot(['a', 'B', 'c', 'd'], [false, true, false, false], 0, 3)).toEqual([
      'c',
      'B',
      'd',
      'a',
    ]);
  });

  it('drops onto a locked slot land in the nearest open slot back towards the start', () => {
    expect(moveToSlot(['a', 'b', 'C', 'd'], [false, false, true, false], 0, 2)).toEqual([
      'b',
      'a',
      'C',
      'd',
    ]);
  });

  it('refuses to move a locked item', () => {
    const order = ['A', 'b'];
    expect(moveToSlot(order, [true, false], 0, 1)).toBe(order);
  });
});
