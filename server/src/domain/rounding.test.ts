import { describe, expect, it } from 'vitest';

import { roundCoordinates, roundTo } from './rounding.js';

describe('roundTo', () => {
  it.each([
    [1.005, 2, 1.01],
    [2.5, 0, 3],
    [12.345, 1, 12.3],
    [100.00000000000001, 0, 100],
    [0, 2, 0],
  ])('roundTo(%d, %d) = %d', (value, decimals, expected) => {
    expect(roundTo(value, decimals)).toBe(expected);
  });
});

describe('roundCoordinates', () => {
  it('rounds to two decimals, including negatives', () => {
    expect(roundCoordinates({ latitude: -33.8688, longitude: 151.2093 })).toEqual({
      latitude: -33.87,
      longitude: 151.21,
    });
  });
});
