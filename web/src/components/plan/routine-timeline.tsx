import { useId, type JSX } from 'react';

import type { ScheduledRoutineBlock } from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';

/** Props for {@link RoutineTimeline}. */
export interface RoutineTimelineProps {
  readonly title: string;
  readonly blocks: readonly ScheduledRoutineBlock[];
}

/**
 * The day as an ordered list of time blocks.
 * @param props - Heading text and routine blocks.
 * @returns The timeline, or nothing when there are no blocks.
 */
export function RoutineTimeline({ title, blocks }: RoutineTimelineProps): JSX.Element | null {
  const { t } = useI18n();
  const headingId = useId();
  if (blocks.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="font-semibold">
        {title}
      </h3>
      <ol className="space-y-3 border-l-2 border-accent pl-4">
        {blocks.map((block) => (
          <li key={`${block.day}-${block.start}-${block.title}`}>
            <p className="font-semibold tabular-nums text-accent-strong">
              {t.time[block.day]} <time>{block.start}</time>–<time>{block.end}</time>
            </p>
            <p className="font-medium">{block.title}</p>
            <p className="text-muted">{block.advice}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
