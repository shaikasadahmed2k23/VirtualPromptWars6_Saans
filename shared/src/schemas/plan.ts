import { z } from 'zod';

import { IMPACT_CATEGORIES, INPUT_LIMITS, PERCENT_SCALE, PLAN_SOURCES } from '../constants.js';

import { naqiResultSchema, outdoorWindowSchema } from './air.js';
import { boundedNumber, boundedText, clockTimeSchema, oneOf } from './primitives.js';

const text = (label: string): z.ZodString => boundedText(label, INPUT_LIMITS.textMax);
const title = (): z.ZodString => boundedText('title', INPUT_LIMITS.titleMax);

/** PM2.5 dose avoided by choosing an alternative over a baseline. */
export const exposureAvoidedSchema = z.strictObject({
  micrograms: z.number().nonnegative(),
  percent: boundedNumber('percent', 0, PERCENT_SCALE),
});

/** The deterministic, computed part of an impact: what Gemini is given and may not change. */
export const impactFactsSchema = z.strictObject({
  id: boundedText('id', INPUT_LIMITS.idMax),
  category: oneOf('impact category', IMPACT_CATEGORIES),
  exposureAvoided: exposureAvoidedSchema.nullable(),
  co2SavedKgPerWeek: z.number().nonnegative().nullable(),
});

/** One recommended change: computed facts plus a title and plain-language explanation. */
export const impactItemSchema = impactFactsSchema.extend({
  title: title(),
  explanation: text('explanation'),
});

/** One time block of the suggested daily routine, in the location's local time. */
export const routineBlockSchema = z.strictObject({
  start: clockTimeSchema,
  end: clockTimeSchema,
  title: title(),
  advice: text('advice'),
});

/** A short, practical suggestion (indoor hack or sustainable alternative). */
export const tipSchema = z.strictObject({ title: title(), detail: text('detail') });

/** What a plan generator writes: words only, never numbers of its own. */
export const planContentSchema = z.strictObject({
  summary: text('summary'),
  routine: z.array(routineBlockSchema).max(INPUT_LIMITS.routineBlocksMax),
  indoorHacks: z.array(tipSchema).max(INPUT_LIMITS.tipsMax),
  alternatives: z.array(tipSchema).max(INPUT_LIMITS.tipsMax),
  /** Explanation for each impact, keyed by the impact's id. */
  impactExplanations: z.record(z.string(), text('explanation')),
});

/** Response of `POST /api/plan`. */
export const planResponseSchema = planContentSchema.omit({ impactExplanations: true }).extend({
  location: z.strictObject({
    label: title(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  generatedAt: z.iso.datetime({ offset: true }),
  currentAqi: naqiResultSchema,
  bestWindow: outdoorWindowSchema.nullable(),
  worstWindow: outdoorWindowSchema.nullable(),
  impacts: z.array(impactItemSchema).max(INPUT_LIMITS.impactItemsMax),
  source: oneOf('source', PLAN_SOURCES),
});

/** Exposure avoided in µg and percent. */
export type ExposureAvoided = z.infer<typeof exposureAvoidedSchema>;
/** Computed impact numbers for one recommendation. */
export type ImpactFacts = z.infer<typeof impactFactsSchema>;
/** One recommendation with its impact and explanation. */
export type ImpactItem = z.infer<typeof impactItemSchema>;
/** One block of the daily routine. */
export type RoutineBlock = z.infer<typeof routineBlockSchema>;
/** A short practical suggestion. */
export type Tip = z.infer<typeof tipSchema>;
/** Words produced by a plan generator. */
export type PlanContent = z.infer<typeof planContentSchema>;
/** Response body of `POST /api/plan`. */
export type PlanResponse = z.infer<typeof planResponseSchema>;
