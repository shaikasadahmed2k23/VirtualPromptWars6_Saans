import type { PlanContext } from '../plan-generator.js';

import { PLAN_COPY } from './copies.js';
import type { WindowWhen } from './plan-copy.js';

/**
 * The day vocabulary for a plan, resolved against the location's current local time.
 * @param context - Plan context (language and local time).
 * @returns What `timeSpan` needs to say today or tomorrow.
 */
export function windowWhen(context: Pick<PlanContext, 'language' | 'localTime'>): WindowWhen {
  return { localNow: context.localTime, days: PLAN_COPY[context.language].days };
}
