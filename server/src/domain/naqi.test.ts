import { describe, expect, it } from 'vitest';

import { NAQI_ADVISORIES } from '@saans/shared';

import { DomainError } from './domain-error.js';
import { categoryForIndex, computeNaqi, INDICATIVE_NOTE, subIndex } from './naqi.js';

describe('subIndex', () => {
  // [concentration, expected sub-index] at each band's lo, hi and hi + 0.1.
  it.each([
    [0, 0],
    [30, 50],
    [30.1, 51],
    [31, 51],
    [60, 100],
    [60.1, 101],
    [61, 101],
    [90, 200],
    [90.1, 201],
    [91, 201],
    [120, 300],
    [120.1, 301],
    [121, 301],
    [250, 400],
    [250.1, 401 + (0.1 * 99) / 130],
    [380, 500],
    [380.1, 500],
    [1000, 500],
  ])('PM2.5 %d µg/m³ → %d', (concentration, expected) => {
    expect(subIndex('pm25', concentration)).toBeCloseTo(expected, 6);
  });

  it.each([
    [0, 0],
    [50, 50],
    [50.1, 51],
    [51, 51],
    [100, 100],
    [100.1, 101],
    [101, 101],
    [250, 200],
    [250.1, 201],
    [251, 201],
    [350, 300],
    [350.1, 301],
    [351, 301],
    [430, 400],
    [430.1, 401 + (0.1 * 99) / 80],
    [510, 500],
    [510.1, 500],
    [2000, 500],
  ])('PM10 %d µg/m³ → %d', (concentration, expected) => {
    expect(subIndex('pm10', concentration)).toBeCloseTo(expected, 6);
  });

  it('interpolates linearly inside a band', () => {
    expect(subIndex('pm25', 45.5)).toBeCloseTo(51 + (14.5 * 49) / 29, 6);
  });

  it.each([
    ['pm25', -1],
    ['pm25', Number.NaN],
    ['pm10', Number.POSITIVE_INFINITY],
    ['pm10', -0.1],
  ] as const)('rejects %s = %d with a DomainError', (pollutant, concentration) => {
    expect(() => subIndex(pollutant, concentration)).toThrow(DomainError);
    expect(() => subIndex(pollutant, concentration)).toThrow(/non-negative finite/);
  });
});

describe('categoryForIndex', () => {
  it.each([
    [0, 'good'],
    [50, 'good'],
    [51, 'satisfactory'],
    [100, 'satisfactory'],
    [101, 'moderate'],
    [200, 'moderate'],
    [201, 'poor'],
    [300, 'poor'],
    [301, 'veryPoor'],
    [400, 'veryPoor'],
    [401, 'severe'],
    [500, 'severe'],
    [600, 'severe'],
  ])('%d → %s', (value, category) => {
    expect(categoryForIndex(value)).toBe(category);
  });
});

describe('computeNaqi', () => {
  it('takes the larger sub-index and names it dominant', () => {
    expect(computeNaqi({ pm25: 30, pm10: 100 })).toMatchObject({
      value: 100,
      category: 'satisfactory',
      dominantPollutant: 'pm10',
    });
    expect(computeNaqi({ pm25: 120, pm10: 100 })).toMatchObject({
      value: 300,
      category: 'poor',
      dominantPollutant: 'pm25',
    });
  });

  it('prefers PM2.5 when both sub-indices tie', () => {
    expect(computeNaqi({ pm25: 30, pm10: 50 }).dominantPollutant).toBe('pm25');
  });

  it('rounds the overall value to an integer', () => {
    expect(computeNaqi({ pm25: 250.1, pm10: 0 }).value).toBe(401);
    expect(computeNaqi({ pm25: 45.5, pm10: 0 }).value).toBe(76);
  });

  it('caps at 500 beyond the assumed Severe upper breakpoint', () => {
    expect(computeNaqi({ pm25: 999, pm10: 999 })).toMatchObject({ value: 500, category: 'severe' });
  });

  it('labels the advisory as indicative and uses the CPCB health statement', () => {
    const { advisory } = computeNaqi({ pm25: 300, pm10: 0 });
    expect(advisory).toBe(`${NAQI_ADVISORIES.en.severe} ${INDICATIVE_NOTE}`);
    expect(advisory).toMatch(/indicative/i);
  });

  it.each([
    { pm25: -5, pm10: 10 },
    { pm25: 10, pm10: Number.NaN },
  ])('throws a DomainError for invalid input %o', (input) => {
    expect(() => computeNaqi(input)).toThrow(DomainError);
  });
});
