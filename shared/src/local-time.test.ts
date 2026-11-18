import { describe, expect, it } from 'vitest';

import { clockHour, clockTime, localDate, startOfHour, toMinutePrecision } from './local-time.js';

describe('local time parts', () => {
  const time = '2026-11-18T07:30';

  it('splits a local time into date, clock time and hour', () => {
    expect(localDate(time)).toBe('2026-11-18');
    expect(clockTime(time)).toBe('07:30');
    expect(clockHour(time)).toBe('07');
  });

  it('truncates to the start of the hour', () => {
    expect(startOfHour(time)).toBe('2026-11-18T07:00');
  });

  it('drops seconds and offsets beyond minute precision', () => {
    expect(toMinutePrecision('2026-11-18T07:30:45.000Z')).toBe(time);
    expect(clockTime('2026-11-18T07:30:45')).toBe('07:30');
  });
});
