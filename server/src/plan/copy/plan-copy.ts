import {
  relativeDay,
  type CommuteMode,
  type NaqiCategory,
  type NaqiResult,
  type OutdoorWindow,
  type RelativeDay,
  type Tip,
} from '@saans/shared';

import { clockTime } from '../../domain/local-time.js';
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

/** Every user-facing string the deterministic planner needs, in one language. */
export interface PlanCopy {
  readonly modeNames: Readonly<Record<CommuteMode, string>>;
  readonly categoryNames: Readonly<Record<NaqiCategory, string>>;
  readonly days: Readonly<Record<RelativeDay, string>>;
  /** Said instead of a time when the cleanest window is the one under way. */
  readonly nowIsGood: string;
  readonly summary: (input: SummaryInput) => string;
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
