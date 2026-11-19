import { z } from 'zod';

import {
  COOKING_FUELS,
  DAYS_PER_WEEK,
  EXERCISE_TIMINGS,
  HOURS_PER_DAY,
  INPUT_LIMITS,
  WORK_LOCATIONS,
} from '../constants/index.js';

import {
  boundedInt,
  boundedNumber,
  boundedText,
  cityNameSchema,
  commuteModeSchema,
  languageSchema,
  latitudeSchema,
  longitudeSchema,
  oneOf,
} from './primitives.js';

/** A validated WGS84 point, as sent by clients. */
export const coordinatesSchema = z.strictObject({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

/** Where the plan is for: coordinates (optionally labelled) or a city name to geocode. */
export const locationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('coords'),
    ...coordinatesSchema.shape,
    label: boundedText('label', INPUT_LIMITS.titleMax).optional(),
  }),
  z.strictObject({ kind: z.literal('city'), name: cityNameSchema('city') }),
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
    location: oneOf('work location', WORK_LOCATIONS),
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
  timing: oneOf('exercise timing', EXERCISE_TIMINGS),
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
  cookingFuel: oneOf('cookingFuel', COOKING_FUELS),
  language: languageSchema,
  notes: boundedText('notes', INPUT_LIMITS.notesMax).optional(),
});

/** Body of `POST /api/plan`. */
export const planRequestSchema = z.strictObject({ profile: userProfileSchema });

/** Validated household profile. */
export type UserProfile = z.infer<typeof userProfileSchema>;
/** Profile location: coordinates or a city name. */
export type Location = z.infer<typeof locationSchema>;
/** A point on the map in WGS84 degrees. */
export type Coordinates = z.infer<typeof coordinatesSchema>;
