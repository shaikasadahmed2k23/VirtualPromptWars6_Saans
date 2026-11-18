import {
  clockTime,
  relativeDay,
  startsNow,
  type CommuteMode,
  type NaqiCategory,
  type NaqiResult,
  type OutdoorWindow,
  type RelativeDay,
  type Tip,
} from '@saans/shared';

import type { ImpactId, KnownImpactFacts } from '../plan-generator.js';

/** How polluted the day is, for choosing which indoor hacks to show. */
export type AirTier = 'clean' | 'polluted' | 'severe';

/** What is needed to say which day a window falls on, in the location's own time. */
export interface WindowWhen {
  /** Current local time at the location, `YYYY-MM-DDTHH:MM`. */
  readonly localNow: string;
  /** The words for each day, in the plan's language. */
  readonly days: Readonly<Record<RelativeDay, string>>;
}

/** Inputs of the one-line summary. */
export interface SummaryInput {
  readonly aqi: NaqiResult;
  readonly bestWindow: OutdoorWindow | null;
  readonly location: string;
  readonly when: WindowWhen;
}

/** The sentences a summary is built from; {@link summarize} decides which ones apply. */
export interface SummaryPhrases {
  readonly current: (location: string, category: string, naqi: number) => string;
  /** No complete window fits the next 24 hours. */
  readonly noWindow: string;
  /** The cleanest window is the one under way. */
  readonly nowIsGood: string;
  readonly cleanest: (span: string) => string;
  /** Every waking hour is Severe, so the best window is only the least bad. */
  readonly leastBad: (span: string) => string;
}

/** The two clauses a metro explanation can contain; {@link metroBenefits} picks between them. */
export interface MetroPhrases {
  readonly co2: (kg: string) => string;
  readonly exposure: (ug: string, pct: string) => string;
}

/** What an impact explanation may refer to. */
export interface ImpactCopyContext {
  readonly when: WindowWhen;
  readonly bestWindow: OutdoorWindow | null;
  readonly worstWindow: OutdoorWindow | null;
  readonly commuteMode: CommuteMode;
}

/** Title and explanation template for one impact. */
export interface ImpactCopy {
  readonly title: string;
  readonly explain: (facts: KnownImpactFacts, context: ImpactCopyContext) => string;
}

/** Every user-facing string the deterministic planner needs, in one language. No logic. */
export interface PlanCopy {
  readonly modeNames: Readonly<Record<CommuteMode, string>>;
  readonly categoryNames: Readonly<Record<NaqiCategory, string>>;
  readonly days: Readonly<Record<RelativeDay, string>>;
  readonly summary: SummaryPhrases;
  readonly routine: {
    readonly outdoor: Tip;
    readonly outdoorUnsafe: Tip;
    readonly stayIn: Tip;
    readonly night: Tip;
  };
  readonly indoorHacks: Readonly<Record<AirTier, readonly Tip[]>>;
  readonly alternatives: {
    readonly commute: Tip;
    readonly cleanCooking: Tip;
    readonly dirtyFuel: Tip;
    readonly heating: Tip;
    readonly waste: Tip;
  };
  readonly impacts: Readonly<Record<ImpactId, ImpactCopy>>;
}

/**
 * Formats a window as `<day> HH:MM–HH:MM`, the day taken from the location's own clock.
 * @param window - The window, or null.
 * @param when - Local now and the day words.
 * @returns For example `tomorrow 14:00–16:00`, or an em dash when there is no window.
 */
export function timeSpan(window: OutdoorWindow | null, when: WindowWhen): string {
  if (window === null) {
    return '—';
  }
  const day = when.days[relativeDay(window.start, when.localNow)];
  return `${day} ${clockTime(window.start)}–${clockTime(window.end)}`;
}

/**
 * The avoided dose of an impact as display strings.
 * @param facts - Computed impact.
 * @returns Micrograms and percent, `0` when the impact has no exposure figure.
 */
export function avoided(facts: KnownImpactFacts): { readonly ug: string; readonly pct: string } {
  return {
    ug: String(facts.exposureAvoided?.micrograms ?? 0),
    pct: String(facts.exposureAvoided?.percent ?? 0),
  };
}

function bestTimeAdvice(phrases: SummaryPhrases, { bestWindow, when }: SummaryInput): string {
  if (bestWindow === null) {
    return phrases.noWindow;
  }
  if (bestWindow.allUnsafe) {
    return phrases.leastBad(timeSpan(bestWindow, when));
  }
  return startsNow(bestWindow.start, when.localNow)
    ? phrases.nowIsGood
    : phrases.cleanest(timeSpan(bestWindow, when));
}

/**
 * The fallback plan's summary: the air right now, then the best time to be outside.
 * @param copy - Phrases in the plan's language.
 * @param input - Current NAQI, the best window and the location's clock.
 * @returns Two sentences.
 */
export function summarize(copy: PlanCopy, input: SummaryInput): string {
  const { aqi, location } = input;
  const current = copy.summary.current(location, copy.categoryNames[aqi.category], aqi.value);
  return `${current} ${bestTimeAdvice(copy.summary, input)}`;
}

/**
 * The benefit clauses of a metro switch. Either benefit can be absent (car to metro changes no
 * exposure; bus to metro saves no CO2). With neither on offer the exposure clause is kept, reading
 * 0, so the sentence is never empty.
 * @param facts - The commute-metro impact.
 * @param phrases - Clause templates in the plan's language.
 * @returns One or two clauses, CO2 first, for the caller to join with its word for "and".
 */
export function metroBenefits(facts: KnownImpactFacts, phrases: MetroPhrases): string[] {
  const { ug, pct } = avoided(facts);
  const co2 = facts.co2SavedKgPerWeek;
  const showExposure = (facts.exposureAvoided?.micrograms ?? 0) > 0 || co2 === null;
  return [
    ...(co2 === null ? [] : [phrases.co2(String(co2))]),
    ...(showExposure ? [phrases.exposure(ug, pct)] : []),
  ];
}
