import { vi, type Mock } from 'vitest';

import type { AirResponse, GeoPlace, HourlyNaqi, PlanResponse } from '@saans/shared';

import type { ApiClient } from '../api/api-client.js';

// Realistic API payloads (they pass the shared schemas) and a fake client.

const hour = (index: number): HourlyNaqi => {
  const clean = index === 8 || index === 9;
  const day = index < 18 ? '18' : '19';
  const hourOfDay = (index + 6) % 24;
  return {
    time: `2026-11-${day}T${String(hourOfDay).padStart(2, '0')}:00`,
    pm25: clean ? 80 : 160,
    pm10: 200,
    naqi: clean ? 167 : 327,
    category: clean ? 'moderate' : 'veryPoor',
  };
};

export const BEST_WINDOW = {
  start: '2026-11-18T14:00',
  end: '2026-11-18T16:00',
  hours: 2,
  meanNaqi: 167,
  meanPm25: 80,
  category: 'moderate',
  allUnsafe: false,
} as const;

export const WORST_WINDOW = {
  ...BEST_WINDOW,
  start: '2026-11-18T07:00',
  end: '2026-11-18T09:00',
  meanNaqi: 327,
  meanPm25: 160,
  category: 'veryPoor',
} as const;

export const AIR_RESPONSE: AirResponse = {
  timezone: 'Asia/Kolkata',
  current: {
    time: '2026-11-18T06:00',
    value: 327,
    category: 'veryPoor',
    dominantPollutant: 'pm25',
    advisory: 'Respiratory illness on prolonged exposure.',
  },
  hourly: Array.from({ length: 42 }, (_, index) => hour(index)),
  bestWindow: BEST_WINDOW,
  worstWindow: WORST_WINDOW,
};

export const DELHI: GeoPlace = {
  id: 1,
  name: 'Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.65,
  longitude: 77.23,
};

export const PLAN_RESPONSE: PlanResponse = {
  location: { label: 'Delhi, India', latitude: 28.65, longitude: 77.23 },
  generatedAt: '2026-11-18T01:00:00.000Z',
  currentAqi: {
    value: 327,
    category: 'veryPoor',
    dominantPollutant: 'pm25',
    advisory: 'Respiratory illness on prolonged exposure.',
  },
  bestWindow: BEST_WINDOW,
  worstWindow: WORST_WINDOW,
  summary: 'Air quality in Delhi is Very poor right now (NAQI 327).',
  routine: [
    {
      start: '07:00',
      end: '09:00',
      title: 'Stay in, windows shut',
      advice: 'Pollution peaks now.',
    },
    { start: '14:00', end: '16:00', title: 'Best time to be outside', advice: 'Do errands now.' },
  ],
  indoorHacks: [{ title: 'Mop, don’t sweep', detail: 'A damp mop keeps dust down.' }],
  alternatives: [{ title: 'Take the metro', detail: 'Enclosed and low-carbon.' }],
  impacts: [
    {
      id: 'commute-metro',
      category: 'commute',
      title: 'Take the metro on office days',
      explanation: 'Saves about 9.79 kg of CO2 a week.',
      exposureAvoided: { micrograms: 105, percent: 70 },
      restHoursEquivalent: 2.1,
      co2SavedKgPerWeek: 9.79,
    },
    {
      id: 'close-windows',
      category: 'indoor',
      title: 'Keep windows shut at the peak',
      explanation: 'Cuts what each person breathes.',
      exposureAvoided: { micrograms: 112, percent: 40 },
      restHoursEquivalent: null,
      co2SavedKgPerWeek: null,
    },
  ],
  source: 'ai',
  language: 'en',
};

export type FakeApi = { [K in keyof ApiClient]: Mock<ApiClient[K]> };

export const fakeApi = (overrides: Partial<FakeApi> = {}): FakeApi => ({
  getAir: vi.fn<ApiClient['getAir']>(() => Promise.resolve(AIR_RESPONSE)),
  geocode: vi.fn<ApiClient['geocode']>(() => Promise.resolve([DELHI])),
  createPlan: vi.fn<ApiClient['createPlan']>(() => Promise.resolve(PLAN_RESPONSE)),
  ...overrides,
});
