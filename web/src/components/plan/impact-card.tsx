import type { JSX } from 'react';

import type { ImpactItem } from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';

/** Props for {@link ImpactCard}. */
export interface ImpactCardProps {
  readonly impact: ImpactItem;
}

/**
 * One recommendation with its computed numbers, an "Estimate" label and the explanation.
 * @param props - The impact.
 * @returns The card.
 */
export function ImpactCard({ impact }: ImpactCardProps): JSX.Element {
  const { t } = useI18n();
  const { exposureAvoided, co2SavedKgPerWeek, restHoursEquivalent } = impact;
  return (
    <div className="h-full rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{impact.title}</h4>
        <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
          {t.plan.estimate}
        </span>
      </div>
      <dl className="mt-2 space-y-1 font-medium tabular-nums">
        {exposureAvoided !== null && exposureAvoided.micrograms > 0 && (
          <div>
            <dt className="sr-only">PM2.5</dt>
            <dd>{t.plan.exposure(exposureAvoided.micrograms, exposureAvoided.percent)}</dd>
            {restHoursEquivalent !== null && (
              <dd className="text-sm font-normal text-muted">
                {t.plan.restHours(restHoursEquivalent)}
              </dd>
            )}
          </div>
        )}
        {co2SavedKgPerWeek !== null && co2SavedKgPerWeek > 0 && (
          <div>
            <dt className="sr-only">CO₂</dt>
            <dd>{t.plan.co2(co2SavedKgPerWeek)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-muted">{impact.explanation}</p>
    </div>
  );
}
