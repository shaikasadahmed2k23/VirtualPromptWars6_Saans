import type { CommuteMode, NaqiCategory, NaqiResult, OutdoorWindow, Tip } from '@saans/shared';

import { clockTime } from '../../domain/local-time.js';
import type { ImpactId, KnownImpactFacts } from '../plan-generator.js';

/** How polluted the day is, for choosing which indoor hacks to show. */
export type AirTier = 'clean' | 'polluted' | 'severe';

/** What an impact explanation may refer to. */
export interface ImpactCopyContext {
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
  readonly summary: (aqi: NaqiResult, bestWindow: OutdoorWindow | null, location: string) => string;
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
 * Formats a window as `HH:MM–HH:MM`.
 * @param window - The window, or null.
 * @returns The time span, or an em dash when there is no window.
 */
export function timeSpan(window: OutdoorWindow | null): string {
  return window === null ? '—' : `${clockTime(window.start)}–${clockTime(window.end)}`;
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
