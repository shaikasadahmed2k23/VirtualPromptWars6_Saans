import { useId, type JSX } from 'react';

import type { Tip } from '@saans/shared';

/** Props for {@link TipList}. */
export interface TipListProps {
  readonly title: string;
  readonly tips: readonly Tip[];
}

/**
 * A titled list of practical tips.
 * @param props - Heading text and tips.
 * @returns The list, or nothing when there are no tips.
 */
export function TipList({ title, tips }: TipListProps): JSX.Element | null {
  const headingId = useId();
  if (tips.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="font-semibold">
        {title}
      </h3>
      <ul className="space-y-3">
        {tips.map((tip) => (
          <li key={tip.title} className="rounded-xl border border-line p-4">
            <p className="font-medium">{tip.title}</p>
            <p className="text-muted">{tip.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
