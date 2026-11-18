import { describe, expect, it } from 'vitest';

import type { HourlyAirSample } from '@saans/shared';

import { DomainError } from './domain-error.js';
import { findBestWindow, findWorstWindow } from './windows.js';

const DATE = '2026-11-18';

// PM2.5 → NAQI with PM10 at 0: 0→0, 30→50, 60→100, 120→300, 300→439, 380→500.
const at = (hour: number, pm25: number): HourlyAirSample => ({
  time: `${DATE}T${String(hour).padStart(2, '0')}:00`,
  pm25,
  pm10: 0,
});

// A full 24-hour day at `base` PM2.5 with selected hours overridden.
const day = (base: number, overrides: Record<number, number> = {}): HourlyAirSample[] =>
  Array.from({ length: 24 }, (_, hour) => at(hour, overrides[hour] ?? base));

describe('findBestWindow / findWorstWindow', () => {
  // Clean air at night (02–03) and late (21–23) must be ignored: outside waking hours
  // or not finishing by 22:00.
  const normalDay = day(120, { 2: 0, 3: 0, 8: 380, 9: 380, 14: 30, 15: 30, 21: 0, 22: 0, 23: 0 });

  it('finds the cleanest 2-hour window within waking hours on a normal day', () => {
    expect(findBestWindow(normalDay)).toEqual({
      start: `${DATE}T14:00`,
      end: `${DATE}T16:00`,
      hours: 2,
      meanNaqi: 50,
      meanPm25: 30,
      category: 'good',
      allUnsafe: false,
    });
  });

  it('finds the most polluted 2-hour window within waking hours', () => {
    expect(findWorstWindow(normalDay)).toMatchObject({
      start: `${DATE}T08:00`,
      end: `${DATE}T10:00`,
      meanNaqi: 500,
      category: 'severe',
      allUnsafe: false,
    });
  });

  it('gives the same answer regardless of sample order', () => {
    expect(findBestWindow([...normalDay].reverse())).toEqual(findBestWindow(normalDay));
  });

  it.each([
    ['empty forecast', []],
    ['forecast shorter than the window', [at(10, 30)]],
    ['no two consecutive hours', [at(6, 30), at(8, 30), at(10, 30), at(12, 30)]],
    ['only night-time hours', [at(0, 0), at(1, 0), at(2, 0), at(23, 0)]],
  ])('returns null for %s', (_label, samples) => {
    expect(findBestWindow(samples)).toBeNull();
    expect(findWorstWindow(samples)).toBeNull();
  });

  it('never spans a gap in the forecast', () => {
    const withGap = day(120, { 11: 0, 13: 0 }).filter((sample) => !sample.time.endsWith('T12:00'));
    expect(findBestWindow(withGap)).toMatchObject({
      start: `${DATE}T10:00`,
      end: `${DATE}T12:00`,
      meanNaqi: 150,
    });
  });

  it('still returns the least-bad window when every waking hour is Severe', () => {
    const allSevere = day(380, { 7: 300 });
    expect(findBestWindow(allSevere)).toEqual({
      start: `${DATE}T06:00`,
      end: `${DATE}T08:00`,
      hours: 2,
      meanNaqi: 470,
      meanPm25: 340,
      category: 'severe',
      allUnsafe: true,
    });
    expect(findWorstWindow(allSevere)?.allUnsafe).toBe(true);
  });

  it('breaks ties in favour of the earliest window', () => {
    const flat = day(60);
    expect(findBestWindow(flat)?.start).toBe(`${DATE}T06:00`);
    expect(findWorstWindow(flat)?.start).toBe(`${DATE}T06:00`);
  });

  it('honours custom window length and waking hours, including a window ending at midnight', () => {
    const options = { lengthHours: 3, wakingStart: 18, wakingEnd: 24 };
    expect(findBestWindow(normalDay, options)).toMatchObject({
      start: `${DATE}T21:00`,
      end: '2026-11-19T00:00',
      hours: 3,
      meanNaqi: 0,
    });
  });

  it.each([
    { lengthHours: 0, wakingStart: 6, wakingEnd: 22 },
    { lengthHours: 1.5, wakingStart: 6, wakingEnd: 22 },
    { lengthHours: 2, wakingStart: -1, wakingEnd: 22 },
    { lengthHours: 2, wakingStart: 6, wakingEnd: 25 },
    { lengthHours: 2, wakingStart: 22, wakingEnd: 6 },
  ])('rejects invalid options %o', (options) => {
    expect(() => findBestWindow(normalDay, options)).toThrow(DomainError);
  });
});
