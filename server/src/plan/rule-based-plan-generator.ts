import {
  NAQI_CATEGORIES,
  WAKING_HOURS,
  type CookingFuel,
  type NaqiCategory,
  type OutdoorWindow,
  type PlanContent,
  type RoutineBlock,
  type Tip,
} from '@saans/shared';

import { clockTime } from '../domain/local-time.js';

import { PLAN_COPY } from './copy/copies.js';
import type { AirTier, ImpactCopyContext, PlanCopy } from './copy/plan-copy.js';
import type { KnownImpactFacts, PlanContext, PlanGenerator } from './plan-generator.js';

const TIER_BY_CATEGORY: Readonly<Record<NaqiCategory, AirTier>> = {
  good: 'clean',
  satisfactory: 'clean',
  moderate: 'polluted',
  poor: 'polluted',
  veryPoor: 'severe',
  severe: 'severe',
};

const DIRTY_FUELS: ReadonlySet<CookingFuel> = new Set(['biomass', 'kerosene', 'coal']);
const LOW_CARBON_MODES: ReadonlySet<string> = new Set(['metro', 'walk', 'cycle']);

const pad = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

const block = (window: OutdoorWindow, tip: Tip): RoutineBlock & { readonly sortKey: string } => ({
  start: clockTime(window.start),
  end: clockTime(window.end),
  title: tip.title,
  advice: tip.detail,
  sortKey: window.start,
});

function buildRoutine({ bestWindow, worstWindow }: PlanContext, copy: PlanCopy): RoutineBlock[] {
  const blocks = [];
  if (bestWindow !== null) {
    const tip = bestWindow.allUnsafe ? copy.routine.outdoorUnsafe : copy.routine.outdoor;
    blocks.push(block(bestWindow, tip));
  }
  if (worstWindow !== null && worstWindow.start !== bestWindow?.start) {
    blocks.push(block(worstWindow, copy.routine.stayIn));
  }
  const chronological = blocks
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ start, end, title, advice }) => ({ start, end, title, advice }));
  const night = copy.routine.night;
  return [
    ...chronological,
    {
      start: pad(WAKING_HOURS.end),
      end: pad(WAKING_HOURS.start),
      title: night.title,
      advice: night.detail,
    },
  ];
}

function buildAlternatives({ profile }: PlanContext, copy: PlanCopy): Tip[] {
  const { alternatives } = copy;
  const commutes = profile.work.location !== 'home' && !LOW_CARBON_MODES.has(profile.commute.mode);
  const cooking = DIRTY_FUELS.has(profile.cookingFuel)
    ? alternatives.dirtyFuel
    : alternatives.cleanCooking;
  return [
    ...(commutes ? [alternatives.commute] : []),
    cooking,
    alternatives.heating,
    alternatives.waste,
  ];
}

/**
 * The air tier that drives indoor advice: the worse of now and the day's peak.
 * @param context - Plan context.
 * @returns The tier for the day's worst conditions.
 */
export function dayTier(context: PlanContext): AirTier {
  const now = context.currentAqi.category;
  const peak = context.worstWindow?.category ?? now;
  const worse = NAQI_CATEGORIES.indexOf(peak) > NAQI_CATEGORIES.indexOf(now) ? peak : now;
  return TIER_BY_CATEGORY[worse];
}

/**
 * Deterministic explanation for one impact, used by the fallback and to fill any gap.
 * @param facts - Computed impact.
 * @param context - Plan context (language, windows, commute mode).
 * @returns The explanation in the context's language.
 */
export function explainImpact(facts: KnownImpactFacts, context: PlanContext): string {
  const copyContext: ImpactCopyContext = {
    bestWindow: context.bestWindow,
    worstWindow: context.worstWindow,
    commuteMode: context.profile.commute.mode,
  };
  return PLAN_COPY[context.language].impacts[facts.id].explain(facts, copyContext);
}

/**
 * Builds a complete plan from static, reviewed copy and the computed facts. Never fails.
 * @param context - Plan context.
 * @returns Plan content in the context's language.
 */
export function buildFallbackContent(context: PlanContext): PlanContent {
  const copy = PLAN_COPY[context.language];
  return {
    summary: copy.summary(context.currentAqi, context.bestWindow, context.locationLabel),
    routine: buildRoutine(context, copy),
    indoorHacks: [...copy.indoorHacks[dayTier(context)]],
    alternatives: buildAlternatives(context, copy),
    impactExplanations: Object.fromEntries(
      context.impacts.map((facts) => [facts.id, explainImpact(facts, context)]),
    ),
  };
}

/** Offline {@link PlanGenerator}: used when Gemini is not configured or fails. */
export class RuleBasedPlanGenerator implements PlanGenerator {
  /**
   * @param context - Plan context.
   * @returns Deterministic plan content; never rejects.
   */
  generate(context: PlanContext): Promise<PlanContent> {
    return Promise.resolve(buildFallbackContent(context));
  }
}
