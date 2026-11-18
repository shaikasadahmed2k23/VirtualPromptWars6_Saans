import type { JSX, ReactNode } from 'react';

/** Props for {@link SectionCard}. */
export interface SectionCardProps {
  /** Unique id; the heading gets `${id}-heading` and labels the section. */
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * A labelled page section on a white card.
 * @param props - Id, heading text and content.
 * @returns A `<section>` whose accessible name is its heading.
 */
export function SectionCard({ id, title, children }: SectionCardProps): JSX.Element {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
    >
      <h2 id={headingId} className="mb-4 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
