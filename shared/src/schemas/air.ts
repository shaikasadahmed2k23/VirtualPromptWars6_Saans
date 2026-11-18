import { z } from 'zod';

import { HOURS_PER_DAY, INPUT_LIMITS, NAQI_MAX_INDEX } from '../constants.js';

import {
  boundedInt,
  boundedNumber,
  boundedText,
  localDateTimeSchema,
  naqiCategorySchema,
  pollutantSchema,
} from './primitives.js';

// Server keeps old forecasts for at most 6 h past their TTL; allow a day so the contract has slack.
const MAX_STALE_MINUTES = 24 * 60;

const concentration = (label: string): z.ZodNumber =>
  boundedNumber(label, 0, INPUT_LIMITS.concentrationMax);

/** One hour of forecast air quality. */
export const hourlyAirSampleSchema = z.strictObject({
  time: localDateTimeSchema,
  pm25: concentration('pm25'),
  pm10: concentration('pm10'),
});

/** NAQI for one set of concentrations. */
export const naqiResultSchema = z.strictObject({
  value: boundedInt('value', 0, NAQI_MAX_INDEX),
  category: naqiCategorySchema,
  dominantPollutant: pollutantSchema,
  advisory: boundedText('advisory', INPUT_LIMITS.textMax),
});

/** A contiguous block of hours recommended for (or against) outdoor activity. */
export const outdoorWindowSchema = z.strictObject({
  start: localDateTimeSchema,
  end: localDateTimeSchema,
  hours: boundedInt('hours', 1, HOURS_PER_DAY),
  meanNaqi: boundedNumber('meanNaqi', 0, NAQI_MAX_INDEX),
  meanPm25: concentration('meanPm25'),
  category: naqiCategorySchema,
  allUnsafe: z.boolean(),
});

/** One hour of the forecast strip: concentrations plus their indicative NAQI. */
export const hourlyNaqiSchema = z.strictObject({
  time: localDateTimeSchema,
  pm25: concentration('pm25'),
  pm10: concentration('pm10'),
  naqi: boundedInt('naqi', 0, NAQI_MAX_INDEX),
  category: naqiCategorySchema,
});

/** Response of `GET /api/air`. */
export const airResponseSchema = z.strictObject({
  timezone: boundedText('timezone', INPUT_LIMITS.titleMax),
  current: naqiResultSchema.extend({ time: localDateTimeSchema }),
  hourly: z.array(hourlyNaqiSchema).max(2 * HOURS_PER_DAY),
  bestWindow: outdoorWindowSchema.nullable(),
  worstWindow: outdoorWindowSchema.nullable(),
  /** Minutes old the readings are when live data was unavailable; null when they are live. */
  staleMinutes: boundedInt('staleMinutes', 0, MAX_STALE_MINUTES).nullable(),
});

/** One geocoding match for a city search. */
export const geoPlaceSchema = z.strictObject({
  id: z.number().int(),
  name: boundedText('name', INPUT_LIMITS.titleMax),
  region: z.string().max(INPUT_LIMITS.titleMax).nullable(),
  country: z.string().max(INPUT_LIMITS.titleMax).nullable(),
  latitude: boundedNumber('latitude', -INPUT_LIMITS.latitude, INPUT_LIMITS.latitude),
  longitude: boundedNumber('longitude', -INPUT_LIMITS.longitude, INPUT_LIMITS.longitude),
});

/** Response of `GET /api/geocode`. */
export const geocodeResponseSchema = z.strictObject({ results: z.array(geoPlaceSchema) });

/** One forecast hour. */
export type HourlyAirSample = z.infer<typeof hourlyAirSampleSchema>;
/** NAQI value, category, dominant pollutant and advisory. */
export type NaqiResult = z.infer<typeof naqiResultSchema>;
/** Suggested outdoor window. */
export type OutdoorWindow = z.infer<typeof outdoorWindowSchema>;
/** One hour of the 48-hour strip. */
export type HourlyNaqi = z.infer<typeof hourlyNaqiSchema>;
/** Response body of `GET /api/air`. */
export type AirResponse = z.infer<typeof airResponseSchema>;
/** A geocoding match. */
export type GeoPlace = z.infer<typeof geoPlaceSchema>;
/** Response body of `GET /api/geocode`. */
export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>;
