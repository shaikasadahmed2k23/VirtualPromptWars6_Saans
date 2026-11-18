import { describe, expect, it } from 'vitest';

import { DomainError } from './domain-error.js';
import {
  co2Saved,
  exposureAvoided,
  inhaledDose,
  restHoursEquivalent,
  type DoseInput,
} from './impact.js';

const outdoorRun: DoseInput = { pm25: 200, hours: 2, activity: 'moderate', protection: 'none' };

describe('inhaledDose', () => {
  // 100 µg/m³ for 1 h: dose = rate × protection factor × 100.
  it.each([
    ['rest', 'none', 50],
    ['rest', 'indoorClosed', 30],
    ['rest', 'indoorHepa', 12.5],
    ['rest', 'n95', 5],
    ['light', 'none', 100],
    ['light', 'indoorClosed', 60],
    ['light', 'indoorHepa', 25],
    ['light', 'n95', 10],
    ['moderate', 'none', 250],
    ['moderate', 'indoorClosed', 150],
    ['moderate', 'indoorHepa', 62.5],
    ['moderate', 'n95', 25],
  ] as const)('%s activity with %s protection → %d µg', (activity, protection, expected) => {
    expect(inhaledDose({ pm25: 100, hours: 1, activity, protection })).toBe(expected);
  });

  it('matches a hand-calculated outdoor run: 200 × 2.5 × 2 × 1 = 1000 µg', () => {
    expect(inhaledDose(outdoorRun)).toBe(1000);
  });

  it('is zero for zero hours', () => {
    expect(inhaledDose({ ...outdoorRun, hours: 0 })).toBe(0);
  });

  it('rounds to 0.1 µg only at the end', () => {
    expect(inhaledDose({ pm25: 33.33, hours: 1, activity: 'light', protection: 'none' })).toBe(
      33.3,
    );
  });

  it.each([
    { ...outdoorRun, pm25: -1 },
    { ...outdoorRun, hours: -1 },
    { ...outdoorRun, hours: Number.NaN },
  ])('throws a DomainError for invalid input %o', (input) => {
    expect(() => inhaledDose(input)).toThrow(DomainError);
  });
});

describe('exposureAvoided', () => {
  it('computes µg and percent avoided by wearing an N95 (1000 → 100 µg)', () => {
    expect(exposureAvoided(outdoorRun, { ...outdoorRun, protection: 'n95' })).toEqual({
      micrograms: 900,
      percent: 90,
    });
  });

  it('computes the benefit of moving the run indoors with a purifier at rest', () => {
    const indoors: DoseInput = { ...outdoorRun, activity: 'rest', protection: 'indoorHepa' };
    // 200 × 0.5 × 2 × 0.25 = 50 µg, so 950 µg (95%) avoided.
    expect(exposureAvoided(outdoorRun, indoors)).toEqual({ micrograms: 950, percent: 95 });
  });

  it('never reports a negative saving when the alternative is worse', () => {
    expect(exposureAvoided({ ...outdoorRun, protection: 'n95' }, outdoorRun)).toEqual({
      micrograms: 0,
      percent: 0,
    });
  });

  it('reports 0% when the baseline dose is zero', () => {
    const none = { ...outdoorRun, hours: 0 };
    expect(exposureAvoided(none, none)).toEqual({ micrograms: 0, percent: 0 });
  });

  it('throws a DomainError when either scenario is invalid', () => {
    expect(() => exposureAvoided(outdoorRun, { ...outdoorRun, pm25: -1 })).toThrow(DomainError);
  });
});

describe('restHoursEquivalent', () => {
  it.each([
    // dose ÷ concentration ÷ 0.5 m³/h
    [112, 100, 2.2],
    [210, 160, 2.6],
    [50, 100, 1],
    [0, 100, 0],
  ])('%d µg at %d µg/m³ is %d hours of resting breathing', (micrograms, pm25, expected) => {
    expect(restHoursEquivalent(micrograms, pm25)).toBe(expected);
  });

  it('is null when the air is clean right now', () => {
    expect(restHoursEquivalent(100, 0)).toBeNull();
  });

  it.each([
    [-1, 100],
    [100, Number.NaN],
  ])('throws a DomainError for invalid input (%d, %d)', (micrograms, pm25) => {
    expect(() => restHoursEquivalent(micrograms, pm25)).toThrow(DomainError);
  });
});

describe('co2Saved', () => {
  const commute = {
    distanceKm: 10,
    tripsPerWeek: 10,
    fromMode: 'petrolCar',
    toMode: 'metro',
  } as const;

  it('matches a hand calculation with TERI factors: 100 km × (0.08773 − 0.02929) = 5.84 kg/week', () => {
    expect(co2Saved(commute)).toBe(5.84);
  });

  it.each([
    ['petrolCar', 'cycle', 8.77],
    ['twoWheeler', 'walk', 4.13],
    ['autoRickshaw', 'metro', 3.48],
    ['bus', 'metro', 0.02],
  ] as const)('%s → %s saves %d kg/week', (fromMode, toMode, expected) => {
    expect(co2Saved({ ...commute, fromMode, toMode })).toBe(expected);
  });

  it('is zero when switching to the same mode', () => {
    expect(co2Saved({ ...commute, toMode: 'petrolCar' })).toBe(0);
  });

  it('is never negative when switching to a dirtier mode', () => {
    expect(co2Saved({ ...commute, fromMode: 'metro', toMode: 'petrolCar' })).toBe(0);
  });

  it('is zero for zero distance or zero trips', () => {
    expect(co2Saved({ ...commute, distanceKm: 0 })).toBe(0);
    expect(co2Saved({ ...commute, tripsPerWeek: 0 })).toBe(0);
  });

  it.each([
    { ...commute, distanceKm: -1 },
    { ...commute, tripsPerWeek: Number.POSITIVE_INFINITY },
  ])('throws a DomainError for invalid input %o', (input) => {
    expect(() => co2Saved(input)).toThrow(DomainError);
  });
});
