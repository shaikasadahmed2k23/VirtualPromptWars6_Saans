import { z } from 'zod';

import {
  ACTIVITY_LEVELS,
  COMMUTE_MODES,
  LANGUAGES,
  NAQI_CATEGORIES,
  POLLUTANTS,
  PROTECTION_LEVELS,
} from '../constants.js';

/**
 * A whole number in `[min, max]` with field-named error messages.
 * @param label - Field name used in messages.
 * @param min - Inclusive lower bound.
 * @param max - Inclusive upper bound.
 * @returns The zod schema.
 */
export function boundedInt(label: string, min: number, max: number): z.ZodNumber {
  return boundedNumber(label, min, max).int(`${label} must be a whole number`);
}

/**
 * A finite number in `[min, max]` with field-named error messages.
 * @param label - Field name used in messages.
 * @param min - Inclusive lower bound.
 * @param max - Inclusive upper bound.
 * @returns The zod schema.
 */
export function boundedNumber(label: string, min: number, max: number): z.ZodNumber {
  return z
    .number({ error: `${label} must be a number` })
    .min(min, `${label} must be at least ${String(min)}`)
    .max(max, `${label} must be at most ${String(max)}`);
}

/**
 * Trimmed, non-empty text of at most `max` characters.
 * @param label - Field name used in messages.
 * @param max - Maximum length after trimming.
 * @returns The zod schema.
 */
export function boundedText(label: string, max: number): z.ZodString {
  return z
    .string({ error: `${label} must be text` })
    .trim()
    .min(1, `${label} must not be empty`)
    .max(max, `${label} must be at most ${String(max)} characters`);
}

/**
 * One of a fixed set of strings, with a message listing the allowed values.
 * @param label - Field name used in messages.
 * @param values - Allowed values.
 * @returns The zod enum schema.
 */
export function oneOf<const T extends readonly [string, ...string[]]>(
  label: string,
  values: T,
): z.ZodEnum<{ [K in T[number]]: K }> {
  return z.enum(values, { error: `${label} must be one of: ${values.join(', ')}` });
}

/** Local wall-clock time at the forecast location, minute precision (e.g. `2026-11-18T06:00`). */
export const localDateTimeSchema = z.iso.datetime({
  local: true,
  precision: -1,
  error: 'time must be an ISO date-time like 2026-11-18T06:00',
});

/** Time of day on a 24-hour clock, e.g. `07:30`. */
export const clockTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM on a 24-hour clock');

/** Schema for {@link ActivityLevel}. */
export const activityLevelSchema = oneOf('activity', ACTIVITY_LEVELS);
/** Schema for {@link ProtectionLevel}. */
export const protectionLevelSchema = oneOf('protection', PROTECTION_LEVELS);
/** Schema for {@link CommuteMode}. */
export const commuteModeSchema = oneOf('commute mode', COMMUTE_MODES);
/** Schema for {@link Pollutant}. */
export const pollutantSchema = oneOf('pollutant', POLLUTANTS);
/** Schema for {@link NaqiCategory}. */
export const naqiCategorySchema = oneOf('category', NAQI_CATEGORIES);
/** Schema for {@link Language}. */
export const languageSchema = oneOf('language', LANGUAGES);
