import type { JSX } from 'react';

import { clockTime, localDate, type HourlyNaqi } from '@saans/shared';

import { useI18n } from '../../i18n/i18n-context.js';

/** Props for {@link ForecastTable}. */
export interface ForecastTableProps {
  readonly hours: readonly HourlyNaqi[];
}

/**
 * Screen-reader alternative to the bar strip: every hour as a table row.
 * @param props - Hourly NAQI series.
 * @returns A visually hidden table.
 */
export function ForecastTable({ hours }: ForecastTableProps): JSX.Element {
  const { t } = useI18n();
  return (
    <table className="sr-only">
      <caption>{t.forecast.tableCaption}</caption>
      <thead>
        <tr>
          <th scope="col">{t.forecast.time}</th>
          <th scope="col">{t.forecast.naqi}</th>
          <th scope="col">{t.forecast.category}</th>
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour.time}>
            <th scope="row">{`${localDate(hour.time)} ${clockTime(hour.time)}`}</th>
            <td>{hour.naqi}</td>
            <td>{t.categories[hour.category]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
