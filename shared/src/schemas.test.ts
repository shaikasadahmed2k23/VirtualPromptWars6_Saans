import { describe, expect, it } from 'vitest';

import {
  apiErrorSchema,
  hourlyAirSampleSchema,
  planRequestSchema,
  planResponseSchema,
  userProfileSchema,
  type UserProfile,
} from './schemas.js';

const validProfile: UserProfile = {
  location: { kind: 'city', name: 'Delhi' },
  household: { adults: 2, children: 1, elderly: 1, hasSensitiveMembers: true },
  commute: { mode: 'petrolCar', distanceKm: 12 },
  work: { location: 'hybrid', startHour: 9, endHour: 18, officeDaysPerWeek: 3 },
  exercise: { timing: 'morning', minutesPerDay: 30 },
  hasPurifier: false,
  cookingFuel: 'lpg',
  language: 'en',
};

// First validation message after setting `path` (e.g. `household.adults`) to `value`.
const firstError = (path: string, value: unknown): string | undefined => {
  const profile: Record<string, unknown> = structuredClone(validProfile);
  const keys = path.split('.');
  const leaf = keys.pop() ?? path;
  const parent = keys.reduce<Record<string, unknown>>(
    (node, key) => node[key] as Record<string, unknown>,
    profile,
  );
  parent[leaf] = value;
  return userProfileSchema.safeParse(profile).error?.issues[0]?.message;
};

describe('userProfileSchema', () => {
  it('accepts a valid profile, with or without coordinates and notes', () => {
    expect(userProfileSchema.parse(validProfile)).toEqual(validProfile);
    const withCoords = {
      ...validProfile,
      location: { kind: 'coords', latitude: 28.61, longitude: 77.21 },
      notes: '  Grandmother has a cough  ',
    };
    expect(userProfileSchema.parse(withCoords).notes).toBe('Grandmother has a cough');
  });

  const coords = (latitude: number, longitude: number): unknown => ({
    kind: 'coords',
    latitude,
    longitude,
  });

  it.each([
    ['location', coords(91, 0), 'latitude must be at most 90'],
    ['location', coords(0, -181), 'longitude must be at least -180'],
    ['location.name', 'D', 'city must be at least 2 characters'],
    ['location.name', 'x'.repeat(101), 'city must be at most 100 characters'],
    ['household.adults', 0, 'adults must be at least 1'],
    ['household.adults', 1.5, 'adults must be a whole number'],
    ['household.children', 21, 'children must be at most 20'],
    ['household.elderly', -1, 'elderly must be at least 0'],
    ['household.hasSensitiveMembers', 'yes', 'hasSensitiveMembers must be true or false'],
    [
      'commute.mode',
      'rocket',
      'commute mode must be one of: petrolCar, twoWheeler, bus, metro, walk, cycle',
    ],
    ['commute.distanceKm', 201, 'distanceKm must be at most 200'],
    ['commute.distanceKm', '12', 'distanceKm must be a number'],
    ['work.startHour', 24, 'startHour must be at most 23'],
    ['work.endHour', 25, 'endHour must be at most 24'],
    ['work.endHour', 8, 'endHour must be after startHour'],
    ['work.officeDaysPerWeek', 8, 'officeDaysPerWeek must be at most 7'],
    ['work.location', 'moon', 'work location must be one of: home, office, hybrid'],
    ['exercise.minutesPerDay', 301, 'minutesPerDay must be at most 300'],
    ['exercise.timing', 'noon', 'exercise timing must be one of: none, morning, evening, flexible'],
    ['hasPurifier', 'no', 'hasPurifier must be true or false'],
    [
      'cookingFuel',
      'wood',
      'cookingFuel must be one of: lpg, png, electric, biomass, kerosene, coal',
    ],
    ['language', 'fr', 'language must be one of: en, hi'],
    ['notes', 'x'.repeat(501), 'notes must be at most 500 characters'],
    ['notes', '   ', 'notes must not be empty'],
    ['notes', 42, 'notes must be text'],
    ['diagnosis', 'asthma', 'Unrecognized key: "diagnosis"'],
  ])('rejects %s = %j with "%s"', (path, value, message) => {
    expect(firstError(path, value)).toBe(message);
  });
});

describe('hourlyAirSampleSchema', () => {
  it('accepts an Open-Meteo style local hour', () => {
    expect(
      hourlyAirSampleSchema.safeParse({ time: '2026-11-18T06:00', pm25: 180, pm10: 260 }).success,
    ).toBe(true);
  });

  it.each([
    [
      { time: '18/11/2026 06:00', pm25: 1, pm10: 1 },
      'time must be an ISO date-time like 2026-11-18T06:00',
    ],
    [{ time: '2026-11-18T06:00', pm25: -1, pm10: 1 }, 'pm25 must be at least 0'],
    [{ time: '2026-11-18T06:00', pm25: 1, pm10: 5001 }, 'pm10 must be at most 5000'],
  ])('rejects %o', (sample, message) => {
    expect(hourlyAirSampleSchema.safeParse(sample).error?.issues[0]?.message).toBe(message);
  });
});

describe('API envelopes', () => {
  it('wraps the profile in a plan request', () => {
    expect(planRequestSchema.safeParse({ profile: validProfile }).success).toBe(true);
    expect(planRequestSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a complete plan response', () => {
    const window = {
      start: '2026-11-18T14:00',
      end: '2026-11-18T16:00',
      hours: 2,
      meanNaqi: 180,
      category: 'moderate',
      allUnsafe: false,
    };
    const response = {
      location: { label: 'Delhi', latitude: 28.61, longitude: 77.21 },
      generatedAt: '2026-11-18T05:30:00+05:30',
      currentAqi: {
        value: 320,
        category: 'veryPoor',
        dominantPollutant: 'pm25',
        advisory: 'Stay in.',
      },
      bestWindow: window,
      worstWindow: null,
      routine: [{ start: window.start, end: window.end, title: 'Walk', advice: 'Go now.' }],
      impacts: [
        {
          id: 'metro-commute',
          category: 'commute',
          title: 'Take the metro',
          explanation: 'Saves CO2.',
          exposureAvoided: { micrograms: 120, percent: 40 },
          co2SavedKgPerWeek: 13.6,
        },
      ],
      generator: 'rules',
    };
    expect(planResponseSchema.safeParse(response).success).toBe(true);
  });

  it('accepts only known error codes', () => {
    expect(
      apiErrorSchema.safeParse({ error: { code: 'RATE_LIMITED', message: 'Slow down' } }).success,
    ).toBe(true);
    expect(apiErrorSchema.safeParse({ error: { code: 'TEAPOT', message: 'x' } }).success).toBe(
      false,
    );
  });
});
