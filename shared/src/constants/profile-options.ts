/** Enumerations for the household profile and the plan response. */

/** Where the main earner works. */
export const WORK_LOCATIONS = ['home', 'office', 'hybrid'] as const;

/** One of {@link WORK_LOCATIONS}. */
export type WorkLocation = (typeof WORK_LOCATIONS)[number];

/** When the household usually exercises outdoors. */
export const EXERCISE_TIMINGS = ['none', 'morning', 'evening', 'flexible'] as const;

/** One of {@link EXERCISE_TIMINGS}. */
export type ExerciseTiming = (typeof EXERCISE_TIMINGS)[number];

/** Interface and plan languages. */
export const LANGUAGES = ['en', 'hi'] as const;

/** One of {@link LANGUAGES}. */
export type Language = (typeof LANGUAGES)[number];

/** Household cooking fuels. */
export const COOKING_FUELS = ['lpg', 'png', 'electric', 'biomass', 'kerosene', 'coal'] as const;

/** One of {@link COOKING_FUELS}. */
export type CookingFuel = (typeof COOKING_FUELS)[number];

/** Areas an impact recommendation can belong to. */
export const IMPACT_CATEGORIES = [
  'routine',
  'indoor',
  'commute',
  'cooking',
  'heating',
  'waste',
] as const;

/** One of {@link IMPACT_CATEGORIES}. */
export type ImpactCategory = (typeof IMPACT_CATEGORIES)[number];

/** Who wrote a plan's words: Gemini, or the deterministic offline fallback. */
export const PLAN_SOURCES = ['ai', 'fallback'] as const;

/** One of {@link PLAN_SOURCES}. */
export type PlanSource = (typeof PLAN_SOURCES)[number];
