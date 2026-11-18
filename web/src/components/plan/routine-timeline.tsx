import { useId, type JSX } from 'react';

import type { RoutineBlock } from '@saans/shared';

/** Props for {@link RoutineTimeline}. */
export interface RoutineTimelineProps {
  readonly title: string;
  readonly blocks: readonly RoutineBlock[];
}

/**
 * The day as an ordered list of time blocks.
 * @param props - Heading text and routine blocks.
 * @returns The timeline, or nothing when there are no blocks.
 */
export function RoutineTimeline({ title, blocks }: RoutineTimelineProps): JSX.Element | null {
  const headingId = useId();
  if (blocks.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="font-semibold">
        {title}
      </h3>
      <ol className="space-y-3 border-l-2 border-accent pl-4">
        {blocks.map((block) => (
          <li key={`${block.start}-${block.title}`}>
            <p className="font-semibold tabular-nums text-accent-strong">
              <time>{block.start}</time>–<time>{block.end}</time>
            </p>
            <p className="font-medium">{block.title}</p>
            <p className="text-muted">{block.advice}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
