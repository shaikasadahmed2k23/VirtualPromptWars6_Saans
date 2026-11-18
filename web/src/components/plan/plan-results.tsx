import { useId, type JSX } from 'react';

import type { PlanResponse } from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';

import { ImpactCard } from './impact-card.js';
import { RoutineTimeline } from './routine-timeline.js';
import { SourceBadge } from './source-badge.js';
import { TipList } from './tip-list.js';

/** Props for {@link PlanResults}. */
export interface PlanResultsProps {
  readonly plan: PlanResponse;
}

/**
 * A finished plan: summary, routine, indoor hacks, alternatives and impact cards.
 * @param props - The plan.
 * @returns The plan content.
 */
export function PlanResults({ plan }: PlanResultsProps): JSX.Element {
  const { t } = useI18n();
  const impactsHeadingId = useId();
  return (
    // The plan keeps the language it was written in, even if the UI language changes later.
    <article lang={plan.language} className="space-y-8">
      <div className="space-y-3">
        <SourceBadge source={plan.source} />
        <p className="text-lg">{plan.summary}</p>
      </div>
      <RoutineTimeline title={t.plan.routine} blocks={plan.routine} />
      <TipList title={t.plan.indoor} tips={plan.indoorHacks} />
      <TipList title={t.plan.alternatives} tips={plan.alternatives} />
      <section aria-labelledby={impactsHeadingId} className="space-y-3">
        <h3 id={impactsHeadingId} className="font-semibold">
          {t.plan.impacts}
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {plan.impacts.map((impact) => (
            <li key={impact.id}>
              <ImpactCard impact={impact} />
            </li>
          ))}
        </ul>
      </section>
      <p className="rounded-xl bg-accent-soft p-4 text-sm">{t.plan.disclaimer}</p>
    </article>
  );
}
