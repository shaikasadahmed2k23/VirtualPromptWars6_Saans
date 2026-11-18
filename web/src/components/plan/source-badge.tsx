import type { JSX } from 'react';

import type { PlanSource } from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';

/** Props for {@link SourceBadge}. */
export interface SourceBadgeProps {
  readonly source: PlanSource;
}

/**
 * Says who wrote the plan's words: Gemini, or the built-in offline guidance.
 * @param props - The plan source.
 * @returns A small pill.
 */
export function SourceBadge({ source }: SourceBadgeProps): JSX.Element {
  const { t } = useI18n();
  const ai = source === 'ai';
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${
        ai ? 'border-accent text-accent-strong' : 'border-line text-muted'
      }`}
    >
      {ai ? t.plan.sourceAi : t.plan.sourceFallback}
    </span>
  );
}
