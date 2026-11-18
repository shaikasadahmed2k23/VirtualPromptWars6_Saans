import type { JSX } from 'react';

import type { ApiFailure } from '../../api/api-client.js';
import { useI18n } from '../../i18n/i18n-context.js';

/** Props for {@link Skeleton}. */
export interface SkeletonProps {
  /** Text announced to assistive technology while loading. */
  readonly label: string;
  readonly lines?: number;
}

/**
 * Placeholder blocks shown while content loads; the pulse stops under reduced motion.
 * @param props - Loading label and number of placeholder lines.
 * @returns A `role="status"` region.
 */
export function Skeleton({ label, lines = 3 }: SkeletonProps): JSX.Element {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-4 animate-pulse rounded bg-line/70 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

/** Props for {@link ErrorNotice}. */
export interface ErrorNoticeProps {
  readonly error: ApiFailure;
  readonly onRetry: () => void;
}

/**
 * A translated error message with a retry button.
 * @param props - Failure code and retry handler.
 * @returns A `role="alert"` block.
 */
export function ErrorNotice({ error, onRetry }: ErrorNoticeProps): JSX.Element {
  const { t } = useI18n();
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-4">
      <p className="text-danger">{t.errors[error]}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-danger px-4 py-2 font-medium text-danger hover:bg-danger/10"
      >
        {t.retry}
      </button>
    </div>
  );
}

/** Props for {@link EmptyNotice}. */
export interface EmptyNoticeProps {
  readonly message: string;
}

/**
 * Friendly hint shown before there is anything to display.
 * @param props - The hint text.
 * @returns A muted paragraph.
 */
export function EmptyNotice({ message }: EmptyNoticeProps): JSX.Element {
  return <p className="text-muted">{message}</p>;
}
