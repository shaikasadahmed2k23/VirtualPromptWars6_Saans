import { describe, expect, it } from 'vitest';

import type { UserProfile } from '@saans/shared';

import { BEST, PROFILE, WORST, window } from '../test/fixtures.js';

import { deriveImpacts, type ImpactInputs } from './candidate-impacts.js';

const inputs = (
  profile: Partial<UserProfile> = {},
  rest: Partial<ImpactInputs> = {},
): ImpactInputs => ({
  profile: { ...PROFILE, ...profile },
  bestWindow: BEST,
  worstWindow: WORST,
  dayMeanPm25: 150,
  currentPm25: 100,
  ...rest,
});

const ids = (input: ImpactInputs): string[] => deriveImpacts(input).map((impact) => impact.id);
const find = (input: ImpactInputs, id: string) =>
  deriveImpacts(input).find((impact) => impact.id === id);

describe('deriveImpacts', () => {
  it('includes every relevant recommendation for a car commuter who exercises', () => {
    expect(ids(inputs())).toEqual([
      'commute-metro',
      'exercise-shift',
      'close-windows',
      'purifier-buy',
    ]);
  });

  it('computes the metro switch for a car commuter: CO2 only, no exposure change', () => {
    // 12 km × 2 trips × 3 days = 72 km/week × (0.08773 − 0.02929) kg = 4.21 kg; car and metro
    // are both closed cabins, so exposure is unchanged.
    expect(find(inputs(), 'commute-metro')).toEqual({
      id: 'commute-metro',
      category: 'commute',
      exposureAvoided: { micrograms: 0, percent: 0 },
      restHoursEquivalent: 0,
      co2SavedKgPerWeek: 4.21,
    });
  });

  it('expresses each avoided dose as hours of resting breathing at the current PM2.5', () => {
    // dose ÷ 100 µg/m³ ÷ 0.5 m³/h: 112 µg → 2.2 h, 210 µg → 4.2 h, 250 µg → 5 h.
    const hours = (id: string): number | null | undefined =>
      find(inputs(), id)?.restHoursEquivalent;
    expect(hours('close-windows')).toBe(2.2);
    expect(hours('purifier-buy')).toBe(4.2);
    expect(hours('exercise-shift')).toBe(5);
  });

  it('has no hours comparison when the air is clean right now', () => {
    expect(find(inputs({}, { currentPm25: 0 }), 'close-windows')?.restHoursEquivalent).toBeNull();
  });

  it('computes exposure and CO2 for a two-wheeler rider switching to metro, plus an N95 option', () => {
    const rider = inputs({ commute: { mode: 'twoWheeler', distanceKm: 10 } });
    // 20 km/day at 20 km/h = 1 h: 150 × 1.0 × 1 × 1 = 150 µg vs 150 × 0.5 × 1 × 0.6 = 45 µg.
    expect(find(rider, 'commute-metro')).toMatchObject({
      exposureAvoided: { micrograms: 105, percent: 70 },
      co2SavedKgPerWeek: 0.72,
    });
    // N95: 150 µg vs 15 µg.
    expect(find(rider, 'commute-n95')?.exposureAvoided).toEqual({ micrograms: 135, percent: 90 });
  });

  it.each([
    ['works from home', { work: { ...PROFILE.work, location: 'home' as const } }],
    ['has no office days', { work: { ...PROFILE.work, officeDaysPerWeek: 0 } }],
    ['lives next to the office', { commute: { mode: 'twoWheeler' as const, distanceKm: 0 } }],
  ])('skips commute advice when the user %s', (_label, profile) => {
    expect(ids(inputs(profile))).not.toContain('commute-metro');
    expect(ids(inputs(profile))).not.toContain('commute-n95');
  });

  it('does not suggest switching to the metro for metro, walking or cycling commuters', () => {
    expect(ids(inputs({ commute: { mode: 'metro', distanceKm: 8 } }))).not.toContain(
      'commute-metro',
    );
    expect(ids(inputs({ commute: { mode: 'cycle', distanceKm: 8 } }))).toContain('commute-n95');
  });

  it('computes moving 30 minutes of exercise from the worst to the best window', () => {
    // 280 × 2.5 × 0.5 = 350 µg vs 80 × 2.5 × 0.5 = 100 µg.
    expect(find(inputs(), 'exercise-shift')?.exposureAvoided).toEqual({
      micrograms: 250,
      percent: 71,
    });
  });

  it('suggests exercising indoors (with the purifier if there is one) when every hour is Severe', () => {
    const severeDay = inputs({ hasPurifier: true }, { bestWindow: window({ allUnsafe: true }) });
    // 150 × 2.5 × 0.5 = 187.5 µg vs × 0.25 = 46.9 µg.
    expect(find(severeDay, 'exercise-indoors')?.exposureAvoided).toEqual({
      micrograms: 140.6,
      percent: 75,
    });
    expect(ids(severeDay)).not.toContain('exercise-shift');
    const noPurifier = inputs({}, { bestWindow: window({ allUnsafe: true }) });
    expect(find(noPurifier, 'exercise-indoors')?.exposureAvoided?.percent).toBe(40);
  });

  it.each([
    ['does not exercise', { exercise: { timing: 'none' as const, minutesPerDay: 30 } }, {}],
    ['exercises zero minutes', { exercise: { timing: 'morning' as const, minutesPerDay: 0 } }, {}],
    ['has no windows to compare', {}, { bestWindow: null }],
    ['has a flat day', {}, { worstWindow: BEST }],
  ])('skips exercise advice when the household %s', (_label, profile, rest) => {
    const result = ids(inputs(profile, rest));
    expect(result).not.toContain('exercise-shift');
    expect(result).not.toContain('exercise-indoors');
  });

  it('computes closing windows during the worst window and skips it without one', () => {
    // 280 × 0.5 × 2 = 280 µg vs × 0.6 = 168 µg.
    expect(find(inputs(), 'close-windows')?.exposureAvoided).toEqual({
      micrograms: 112,
      percent: 40,
    });
    expect(ids(inputs({}, { worstWindow: null }))).not.toContain('close-windows');
  });

  it('suggests running an existing purifier, or getting one, overnight', () => {
    // 150 × 0.5 × 8 × 0.6 = 360 µg vs × 0.25 = 150 µg.
    expect(find(inputs(), 'purifier-buy')?.exposureAvoided).toEqual({
      micrograms: 210,
      percent: 58,
    });
    expect(ids(inputs({ hasPurifier: true }))).toContain('purifier-run');
  });
});
