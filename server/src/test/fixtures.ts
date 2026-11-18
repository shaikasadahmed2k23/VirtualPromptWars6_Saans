import type {
  GeoPlace,
  HourlyAirSample,
  NaqiResult,
  OutdoorWindow,
  UserProfile,
} from '@saans/shared';

import type { PlanContext } from '../plan/plan-generator.js';
import { toPromptProfile } from '../plan/prompt.js';
import type { AirQualityForecast } from '../providers/aqi-provider.js';

// Shared, realistic test data: a Delhi family on a very poor winter day.

export const PROFILE: UserProfile = {
  location: { kind: 'coords', latitude: 28.6139, longitude: 77.209, label: 'New Delhi' },
  household: { adults: 2, children: 1, elderly: 1, hasSensitiveMembers: true },
  commute: { mode: 'petrolCar', distanceKm: 12 },
  work: { location: 'hybrid', startHour: 9, endHour: 18, officeDaysPerWeek: 3 },
  exercise: { timing: 'morning', minutesPerDay: 30 },
  hasPurifier: false,
  cookingFuel: 'lpg',
  language: 'en',
};

// What the geocoder returns for "Delhi".
export const DELHI_PLACE: GeoPlace = {
  id: 1_273_294,
  name: 'Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.65,
  longitude: 77.23,
};

export const window = (overrides: Partial<OutdoorWindow> = {}): OutdoorWindow => ({
  start: '2026-11-18T14:00',
  end: '2026-11-18T16:00',
  hours: 2,
  meanNaqi: 180,
  meanPm25: 80,
  category: 'moderate',
  allUnsafe: false,
  ...overrides,
});

export const BEST = window();
export const WORST = window({
  start: '2026-11-18T07:00',
  end: '2026-11-18T09:00',
  meanNaqi: 420,
  meanPm25: 280,
  category: 'severe',
});

export const CURRENT_AQI: NaqiResult = {
  value: 330,
  category: 'veryPoor',
  dominantPollutant: 'pm25',
  advisory: 'Respiratory illness on prolonged exposure.',
};

export const context = (overrides: Partial<PlanContext> = {}): PlanContext => ({
  language: 'en',
  locationLabel: 'New Delhi',
  localTime: '2026-11-18T06:30',
  currentAqi: CURRENT_AQI,
  bestWindow: BEST,
  worstWindow: WORST,
  impacts: [
    {
      id: 'close-windows',
      category: 'indoor',
      exposureAvoided: { micrograms: 112, percent: 40 },
      restHoursEquivalent: 1.4,
      co2SavedKgPerWeek: null,
    },
  ],
  profile: toPromptProfile(PROFILE),
  ...overrides,
});

// 48 hours from local midnight: PM2.5 160 (Very Poor), 80 (Moderate) 14:00–16:00.
export const FORECAST_SAMPLES: HourlyAirSample[] = Array.from({ length: 48 }, (_, index) => {
  const day = index < 24 ? '18' : '19';
  const hourOfDay = index % 24;
  const clean = hourOfDay >= 14 && hourOfDay < 16;
  return {
    time: `2026-11-${day}T${String(hourOfDay).padStart(2, '0')}:00`,
    pm25: clean ? 80 : 160,
    pm10: 200,
  };
});

// 2026-11-18 06:30 in India (UTC+05:30).
export const NOW_MS = Date.UTC(2026, 10, 18, 1, 0);
export const IST_OFFSET_SECONDS = 19_800;

// What an AqiProvider returns for Delhi: the 48-hour samples above in IST.
export const forecastFixture = (
  overrides: Partial<AirQualityForecast> = {},
): AirQualityForecast => ({
  timezone: 'Asia/Kolkata',
  utcOffsetSeconds: IST_OFFSET_SECONDS,
  samples: FORECAST_SAMPLES,
  ...overrides,
});
