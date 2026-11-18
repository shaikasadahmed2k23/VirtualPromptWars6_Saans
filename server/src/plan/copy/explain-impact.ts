import type { KnownImpactFacts, PlanContext } from '../plan-generator.js';

import { PLAN_COPY } from './copies.js';
import type { ImpactCopyContext } from './plan-copy.js';
import { windowWhen } from './window-when.js';

/**
 * Deterministic explanation for one impact: the whole text of offline plans, and the
 * filler for any explanation Gemini leaves out.
 * @param facts - Computed impact.
 * @param context - Plan context (language, windows, commute mode).
 * @returns The explanation in the context's language.
 */
export function explainImpact(facts: KnownImpactFacts, context: PlanContext): string {
  const copyContext: ImpactCopyContext = {
    when: windowWhen(context),
    bestWindow: context.bestWindow,
    worstWindow: context.worstWindow,
    commuteMode: context.profile.commute.mode,
  };
  return PLAN_COPY[context.language].impacts[facts.id].explain(facts, copyContext);
}
