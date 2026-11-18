import { describe, expect, it } from 'vitest';

import {
  addHours,
  clockTime,
  epochHourToLocal,
  localEpochHour,
  localTimeAt,
  startOfHour,
} from './local-time.js';

describe('local time helpers', () => {
  it('converts UTC now to local wall-clock time using the offset', () => {
    // 2026-11-18T00:45Z is 06:15 in India (UTC+05:30).
    expect(localTimeAt(Date.UTC(2026, 10, 18, 0, 45), 19_800)).toBe('2026-11-18T06:15');
  });

  it('truncates to the hour and shifts across midnight', () => {
    expect(startOfHour('2026-11-18T06:15')).toBe('2026-11-18T06:00');
    expect(addHours('2026-11-18T23:00', 2)).toBe('2026-11-19T01:00');
    expect(addHours('2026-11-18T00:00', -1)).toBe('2026-11-17T23:00');
  });

  it('extracts the clock time', () => {
    expect(clockTime('2026-11-18T07:30')).toBe('07:30');
  });

  it('numbers consecutive hours consecutively and round-trips them', () => {
    const hour = localEpochHour('2026-11-18T23:00');
    expect(localEpochHour('2026-11-19T00:00')).toBe(hour + 1);
    expect(epochHourToLocal(hour)).toBe('2026-11-18T23:00');
  });
});
