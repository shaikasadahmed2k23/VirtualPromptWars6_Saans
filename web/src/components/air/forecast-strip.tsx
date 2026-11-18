import type { JSX } from 'react';

import {
  HOURS_PER_DAY,
  NAQI_MAX_INDEX,
  PERCENT_SCALE,
  clockHour,
  relativeDay,
  startsNow,
  type AirResponse,
  type HourlyNaqi,
  type OutdoorWindow,
} from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';
import { CATEGORY_COLOURS } from '../../naqi/category-meta.js';

import { CategoryBadge } from './category-badge.js';
import { ForecastTable } from './forecast-table.js';
import { inWindow, windowSpan } from './window-format.js';

// Label every third hour so the strip stays readable on phones.
const LABEL_EVERY_HOURS = 3;

/** Props for {@link ForecastStrip}. */
export interface ForecastStripProps {
  readonly data: AirResponse;
}

/**
 * 48-hour NAQI bar strip (CSS only) with best/worst windows marked, plus a table alternative.
 * @param props - The air response.
 * @returns The forecast figure.
 */
export function ForecastStrip({ data }: ForecastStripProps): JSX.Element {
  const { t } = useI18n();
  return (
    <figure className="space-y-4">
      <figcaption>
        <h3 className="font-semibold">{t.forecast.heading}</h3>
        <p className="text-sm text-muted">{t.forecast.summary}</p>
        <p className="text-sm text-muted">{t.forecast.windowsNote}</p>
      </figcaption>
      <WindowSummary
        label={t.forecast.best}
        window={data.bestWindow}
        now={data.current.time}
        nowText={t.forecast.nowBest}
        marker="bg-accent"
      />
      <WindowSummary
        label={t.forecast.worst}
        window={data.worstWindow}
        now={data.current.time}
        nowText={t.forecast.nowWorst}
        marker="bg-ink"
      />
      <div aria-hidden="true" className="overflow-x-auto pb-2">
        <ol className="flex h-36 min-w-max items-end gap-0.5 pt-6">
          {data.hourly.map((hour, index) => (
            <Bar key={hour.time} hour={hour} index={index} data={data} />
          ))}
        </ol>
      </div>
      <ForecastTable hours={data.hourly} />
    </figure>
  );
}

interface BarProps {
  readonly hour: HourlyNaqi;
  readonly index: number;
  readonly data: AirResponse;
}

function Bar({ hour, index, data }: BarProps): JSX.Element {
  const best = inWindow(hour.time, data.bestWindow);
  const worst = inWindow(hour.time, data.worstWindow);
  const marker = best ? 'border-accent' : worst ? 'border-ink' : 'border-transparent';
  const startsAfterWindowRange = index === HOURS_PER_DAY;
  return (
    <li
      className={`relative flex h-full w-3 flex-col items-center justify-end sm:w-3.5 ${
        startsAfterWindowRange ? 'border-l-2 border-dashed border-ink' : ''
      }`}
    >
      {startsAfterWindowRange && <BoundaryLabel />}
      <span
        className={`w-full rounded-t border-b-4 ${marker}`}
        style={{
          height: `${String(Math.max(2, (hour.naqi / NAQI_MAX_INDEX) * PERCENT_SCALE))}%`,
          backgroundColor: CATEGORY_COLOURS[hour.category].background,
        }}
      />
      <span className="mt-1 h-4 text-[10px] text-muted">
        {index % LABEL_EVERY_HOURS === 0 ? clockHour(hour.time) : ''}
      </span>
    </li>
  );
}

// Text plus a dashed line, so the 24-hour edge is never marked by colour alone.
function BoundaryLabel(): JSX.Element {
  const { t } = useI18n();
  return (
    <span className="absolute -top-5 right-1 whitespace-nowrap text-[10px] font-semibold">
      {`${t.forecast.boundary} ▸`}
    </span>
  );
}

interface WindowSummaryProps {
  readonly label: string;
  readonly window: OutdoorWindow | null;
  /** Current local time at the location, which decides today or tomorrow. */
  readonly now: string;
  /** Said in place of a clock time when the window is already under way. */
  readonly nowText: string;
  readonly marker: string;
}

function WindowSummary({
  label,
  window,
  now,
  nowText,
  marker,
}: WindowSummaryProps): JSX.Element | null {
  const { t } = useI18n();
  if (window === null) return null;
  const when = startsNow(window.start, now)
    ? nowText
    : `${t.time[relativeDay(window.start, now)]} ${windowSpan(window)}`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span aria-hidden="true" className={`inline-block h-1 w-5 rounded ${marker}`} />
      <span className="font-semibold">{label}:</span>
      <span>{t.forecast.window(when, window.meanNaqi, t.categories[window.category])}</span>
      <CategoryBadge category={window.category} />
      {window.allUnsafe && <span className="w-full text-danger">{t.forecast.allUnsafe}</span>}
    </div>
  );
}
