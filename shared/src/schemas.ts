import { z } from 'zod';

import {
  ACTIVITY_LEVELS,
  COMMUTE_MODES,
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  INPUT_LIMITS,
  NAQI_CATEGORIES,
  NAQI_MAX_INDEX,
  PERCENT_SCALE,
  POLLUTANTS,
  PROTECTION_LEVELS,
} from './constants.js';

const boundedInt = (label: string, min: number, max: number): z.ZodNumber =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${String(min)}`)
    .max(max, `${label} must be at most ${String(max)}`);

const boundedNumber = (label: string, min: number, max: number): z.ZodNumber =>
  z
    .number({ error: `${label} must be a number` })
    .min(min, `${label} must be at least ${String(min)}`)
    .max(max, `${label} must be at most ${String(max)}`);

const boundedText = (label: string, max: number): z.ZodString =>
  z
    .string({ error: `${label} must be text` })
    .trim()
    .min(1, `${label} must not be empty`)
    .max(max, `${label} must be at most ${String(max)} characters`);

const oneOf = <const T extends readonly [string, ...string[]]>(label: string, values: T) =>
  z.enum(values, { error: `${label} must be one of: ${values.join(', ')}` });

/** Local wall-clock time at the forecast location, minute precision (e.g. `2026-11-18T06:00`). */
export const localDateTimeSchema = z.iso.datetime({
  local: true,
  precision: -1,
  error: 'time must be an ISO date-time like 2026-11-18T06:00',
});

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

/** Where the plan is for: explicit coordinates or a city name to geocode. */
export const locationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('coords'),
    latitude: boundedNumber('latitude', -INPUT_LIMITS.latitude, INPUT_LIMITS.latitude),
    longitude: boundedNumber('longitude', -INPUT_LIMITS.longitude, INPUT_LIMITS.longitude),
  }),
  z.strictObject({
    kind: z.literal('city'),
    name: boundedText('city', INPUT_LIMITS.cityNameMax).min(
      INPUT_LIMITS.cityNameMin,
      `city must be at least ${String(INPUT_LIMITS.cityNameMin)} characters`,
    ),
  }),
]);

const membersMax = INPUT_LIMITS.householdMembersMax;

/** Who lives in the household. Deliberately has no diagnosis fields. */
export const householdSchema = z.strictObject({
  adults: boundedInt('adults', 1, membersMax),
  children: boundedInt('children', 0, membersMax),
  elderly: boundedInt('elderly', 0, membersMax),
  hasSensitiveMembers: z.boolean({ error: 'hasSensitiveMembers must be true or false' }),
});

/** Usual commute, one way. */
export const commuteSchema = z.strictObject({
  mode: commuteModeSchema,
  distanceKm: boundedNumber('distanceKm', 0, INPUT_LIMITS.commuteKmMax),
});

/** Where and when the main earner works. */
export const workScheduleSchema = z
  .strictObject({
    location: oneOf('work location', ['home', 'office', 'hybrid']),
    startHour: boundedInt('startHour', 0, HOURS_PER_DAY - 1),
    endHour: boundedInt('endHour', 1, HOURS_PER_DAY),
    officeDaysPerWeek: boundedInt('officeDaysPerWeek', 0, DAYS_PER_WEEK),
  })
  .refine((work) => work.endHour > work.startHour, {
    message: 'endHour must be after startHour',
    path: ['endHour'],
  });

/** Outdoor exercise habit. */
export const exerciseSchema = z.strictObject({
  timing: oneOf('exercise timing', ['none', 'morning', 'evening', 'flexible']),
  minutesPerDay: boundedInt('minutesPerDay', 0, INPUT_LIMITS.exerciseMinutesMax),
});

/** Everything the planner knows about a household; validated server-side on every request. */
export const userProfileSchema = z.strictObject({
  location: locationSchema,
  household: householdSchema,
  commute: commuteSchema,
  work: workScheduleSchema,
  exercise: exerciseSchema,
  hasPurifier: z.boolean({ error: 'hasPurifier must be true or false' }),
  cookingFuel: oneOf('cookingFuel', ['lpg', 'png', 'electric', 'biomass', 'kerosene', 'coal']),
  language: oneOf('language', ['en', 'hi']),
  notes: boundedText('notes', INPUT_LIMITS.notesMax).optional(),
});

/** One hour of forecast air quality. */
export const hourlyAirSampleSchema = z.strictObject({
  time: localDateTimeSchema,
  pm25: boundedNumber('pm25', 0, INPUT_LIMITS.concentrationMax),
  pm10: boundedNumber('pm10', 0, INPUT_LIMITS.concentrationMax),
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
  category: naqiCategorySchema,
  allUnsafe: z.boolean(),
});

/** PM2.5 dose avoided by choosing an alternative over a baseline. */
export const exposureAvoidedSchema = z.strictObject({
  micrograms: z.number().nonnegative(),
  percent: boundedNumber('percent', 0, PERCENT_SCALE),
});

/** One recommended change and its estimated, deterministically computed impact. */
export const impactItemSchema = z.strictObject({
  id: boundedText('id', INPUT_LIMITS.idMax),
  category: z.enum(['routine', 'indoor', 'commute', 'cooking', 'heating', 'waste']),
  title: boundedText('title', INPUT_LIMITS.titleMax),
  explanation: boundedText('explanation', INPUT_LIMITS.textMax),
  exposureAvoided: exposureAvoidedSchema.nullable(),
  co2SavedKgPerWeek: z.number().nonnegative().nullable(),
});

/** One time block of the suggested daily routine. */
export const routineBlockSchema = z.strictObject({
  start: localDateTimeSchema,
  end: localDateTimeSchema,
  title: boundedText('title', INPUT_LIMITS.titleMax),
  advice: boundedText('advice', INPUT_LIMITS.textMax),
});

/** Body of `POST /api/plan`. */
export const planRequestSchema = z.strictObject({ profile: userProfileSchema });

/** Response of `POST /api/plan`. */
export const planResponseSchema = z.strictObject({
  location: z.strictObject({
    label: boundedText('label', INPUT_LIMITS.titleMax),
    latitude: z.number(),
    longitude: z.number(),
  }),
  generatedAt: z.iso.datetime({ offset: true }),
  currentAqi: naqiResultSchema,
  bestWindow: outdoorWindowSchema.nullable(),
  worstWindow: outdoorWindowSchema.nullable(),
  routine: z.array(routineBlockSchema).max(INPUT_LIMITS.routineBlocksMax),
  impacts: z.array(impactItemSchema).max(INPUT_LIMITS.impactItemsMax),
  generator: z.enum(['gemini', 'rules']),
});

/** Machine-readable error codes returned by the API. */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'RATE_LIMITED',
  'UPSTREAM_ERROR',
  'INTERNAL_ERROR',
]);

/** The single error shape every API failure uses: `{ error: { code, message } }`. */
export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: boundedText('message', INPUT_LIMITS.textMax),
  }),
});

/** Validated household profile. */
export type UserProfile = z.infer<typeof userProfileSchema>;
/** Profile location: coordinates or a city name. */
export type Location = z.infer<typeof locationSchema>;
/** One forecast hour. */
export type HourlyAirSample = z.infer<typeof hourlyAirSampleSchema>;
/** NAQI value, category, dominant pollutant and advisory. */
export type NaqiResult = z.infer<typeof naqiResultSchema>;
/** Suggested outdoor window. */
export type OutdoorWindow = z.infer<typeof outdoorWindowSchema>;
/** Exposure avoided in µg and percent. */
export type ExposureAvoided = z.infer<typeof exposureAvoidedSchema>;
/** One recommendation with its impact. */
export type ImpactItem = z.infer<typeof impactItemSchema>;
/** One block of the daily routine. */
export type RoutineBlock = z.infer<typeof routineBlockSchema>;
/** Request body of `POST /api/plan`. */
export type PlanRequest = z.infer<typeof planRequestSchema>;
/** Response body of `POST /api/plan`. */
export type PlanResponse = z.infer<typeof planResponseSchema>;
/** API error code. */
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
/** API error body. */
export type ApiError = z.infer<typeof apiErrorSchema>;
