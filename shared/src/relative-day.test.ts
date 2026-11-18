import { describe, expect, it } from 'vitest';

import { relativeDay, startsNow } from './relative-day.js';

describe('relativeDay', () => {
  it.each([
    { now: '2026-11-18T08:00', instant: '2026-11-18T14:00', expected: 'today' },
    { now: '2026-11-18T08:00', instant: '2026-11-19T07:00', expected: 'tomorrow' },
    { now: '2026-11-18T16:14', instant: '2026-11-18T16:00', expected: 'today' },
    { now: '2026-11-18T16:14', instant: '2026-11-18T22:00', expected: 'today' },
    { now: '2026-11-18T16:14', instant: '2026-11-19T14:00', expected: 'tomorrow' },
    { now: '2026-11-18T23:30', instant: '2026-11-18T23:00', expected: 'today' },
    { now: '2026-11-18T23:30', instant: '2026-11-19T00:00', expected: 'tomorrow' },
    { now: '2026-11-18T23:30', instant: '2026-11-19T14:00', expected: 'tomorrow' },
    { now: '2026-11-30T20:00', instant: '2026-12-01T06:00', expected: 'tomorrow' },
    { now: '2026-12-31T20:00', instant: '2027-01-01T06:00', expected: 'tomorrow' },
    { now: '2028-02-28T20:00', instant: '2028-02-29T06:00', expected: 'tomorrow' },
  ])('at $now, $instant is $expected', ({ now, instant, expected }) => {
    expect(relativeDay(instant, now)).toBe(expected);
  });
});

describe('startsNow', () => {
  it.each([
    { name: 'starts in the current hour', start: '2026-11-18T16:00', now: '2026-11-18T16:14' },
    { name: 'began earlier', start: '2026-11-18T15:00', now: '2026-11-18T16:14' },
    { name: 'exactly on the hour', start: '2026-11-18T08:00', now: '2026-11-18T08:00' },
  ])('is true when the window $name', ({ start, now }) => {
    expect(startsNow(start, now)).toBe(true);
  });

  it.each([
    { name: 'starts next hour', start: '2026-11-18T17:00', now: '2026-11-18T16:14' },
    { name: 'starts tomorrow', start: '2026-11-19T14:00', now: '2026-11-18T16:14' },
    { name: 'starts just after midnight', start: '2026-11-19T00:00', now: '2026-11-18T23:30' },
  ])('is false when the window $name', ({ start, now }) => {
    expect(startsNow(start, now)).toBe(false);
  });
});
