import { lazy, Suspense, type JSX } from 'react';

import type { PlanRequestState } from '../../hooks/use-plan.js';
import { useI18n } from '../../i18n/i18n-context.js';
import { SectionCard } from '../ui/section-card.js';
import { EmptyNotice, ErrorNotice, Skeleton } from '../ui/status.js';

// The results UI is only needed after a plan arrives, so it is code-split.
const PlanResults = lazy(async () => {
  const module = await import('./plan-results.js');
  return { default: module.PlanResults };
});

/** Props for {@link PlanSection}. */
export interface PlanSectionProps {
  readonly plan: PlanRequestState;
}

/**
 * The plan area: a polite live region that announces loading, errors and results.
 * @param props - Plan request state.
 * @returns The plan section.
 */
export function PlanSection({ plan }: PlanSectionProps): JSX.Element {
  const { t } = useI18n();
  const { state } = plan;
  return (
    <SectionCard id="plan" title={t.plan.heading}>
      <div aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'idle' && <EmptyNotice message={t.plan.empty} />}
        {state.status === 'loading' && <Skeleton label={t.plan.loading} lines={6} />}
        {state.status === 'error' && <ErrorNotice error={state.error} onRetry={plan.retry} />}
        {state.status === 'success' && (
          <Suspense fallback={<Skeleton label={t.plan.loading} lines={6} />}>
            <PlanResults plan={state.data} />
          </Suspense>
        )}
      </div>
    </SectionCard>
  );
}
