import type { JSX } from 'react';

import { clockTime, type AirResponse } from '@saans/shared';

import type { AirQuality } from '../../hooks/use-air-quality.js';
import { useI18n } from '../../i18n/i18n-context.js';
import { SectionCard } from '../ui/section-card.js';
import { EmptyNotice, ErrorNotice, Skeleton } from '../ui/status.js';

import { CategoryBadge } from './category-badge.js';
import { ForecastStrip } from './forecast-strip.js';

/** Props for {@link AirNow}. */
export interface AirNowProps {
  readonly air: AirQuality;
}

/**
 * Current NAQI and the 48-hour outlook, with loading, error and empty states.
 * @param props - Air-quality request state.
 * @returns The "Air right now" section.
 */
export function AirNow({ air }: AirNowProps): JSX.Element {
  const { t } = useI18n();
  const { state } = air;
  return (
    <SectionCard id="air" title={t.air.heading}>
      {state.status === 'idle' && <EmptyNotice message={t.air.empty} />}
      {state.status === 'loading' && <Skeleton label={t.air.loading} lines={4} />}
      {state.status === 'error' && <ErrorNotice error={state.error} onRetry={air.retry} />}
      {state.status === 'success' && <AirReading data={state.data} />}
    </SectionCard>
  );
}

function AirReading({ data }: { readonly data: AirResponse }): JSX.Element {
  const { t } = useI18n();
  const { current } = data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <p className="leading-none">
          <span className="block text-sm font-medium text-muted">{t.air.naqi}</span>
          <span className="text-6xl font-bold tabular-nums">{current.value}</span>
        </p>
        <CategoryBadge category={current.category} size="lg" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{t.air.dominant(t.air.pollutants[current.dominantPollutant])}</p>
        <p>{t.advisories[current.category]}</p>
        <p className="text-sm text-muted">
          {t.air.asOf(clockTime(current.time))} · {t.air.indicative}
        </p>
      </div>
      {data.staleMinutes !== null && (
        <p role="status" className="rounded-xl border border-line bg-line/20 p-3 text-sm">
          {t.air.stale(data.staleMinutes)}
        </p>
      )}
      <ForecastStrip data={data} />
    </div>
  );
}
