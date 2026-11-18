import {
  DISPLAY_DECIMALS,
  HOURS_PER_DAY,
  startOfHour,
  type HourlyAirSample,
  type HourlyNaqi,
  type NaqiResult,
  type OutdoorWindow,
} from '@saans/shared';

import { addHours } from './local-time.js';
import { computeNaqi } from './naqi.js';
import { roundTo } from './rounding.js';
import { findBestWindow, findWorstWindow } from './windows.js';

/** Everything derived from one forecast at one moment. */
export interface AirSnapshot {
  /** NAQI for the latest hour at or before now (or the first hour, if all are later). */
  readonly current: NaqiResult & { readonly time: string };
  /** PM2.5 (µg/m³) of that same current hour. */
  readonly currentPm25: number;
  /** Every forecast hour from the current hour on, with its indicative NAQI. */
  readonly hourly: readonly HourlyNaqi[];
  /** Cleanest outdoor window in the next 24 hours. */
  readonly bestWindow: OutdoorWindow | null;
  /** Most polluted outdoor window in the next 24 hours. */
  readonly worstWindow: OutdoorWindow | null;
  /** Mean PM2.5 (µg/m³) over the next 24 hours, used for all-day exposure estimates. */
  readonly dayMeanPm25: number;
}

const byTime = (a: HourlyAirSample, b: HourlyAirSample): number => a.time.localeCompare(b.time);

const toHourlyNaqi = (sample: HourlyAirSample): HourlyNaqi => {
  const { value, category } = computeNaqi(sample);
  return { ...sample, naqi: value, category };
};

const meanPm25 = (samples: readonly HourlyAirSample[]): number =>
  samples.reduce((sum, sample) => sum + sample.pm25, 0) / samples.length;

/**
 * Summarises a forecast as seen at `localNow`.
 * @param samples - Forecast hours (any order, gaps allowed), local wall-clock times.
 * @param localNow - Current local time at the location, `YYYY-MM-DDTHH:MM`.
 * @returns The snapshot, or null when the forecast has no hours at all.
 * @throws {DomainError} When a sample has invalid concentrations.
 */
export function buildAirSnapshot(
  samples: readonly HourlyAirSample[],
  localNow: string,
): AirSnapshot | null {
  const sorted = [...samples].sort(byTime);
  const [first] = sorted;
  if (first === undefined) {
    return null;
  }
  const hourStart = startOfHour(localNow);
  const dayEnd = addHours(hourStart, HOURS_PER_DAY);
  const currentSample = sorted.findLast((sample) => sample.time <= hourStart) ?? first;
  const upcoming = sorted.filter((sample) => sample.time >= hourStart && sample.time < dayEnd);
  const dayMean = upcoming.length > 0 ? meanPm25(upcoming) : currentSample.pm25;
  return {
    current: { ...computeNaqi(currentSample), time: currentSample.time },
    currentPm25: currentSample.pm25,
    hourly: sorted.filter((sample) => sample.time >= hourStart).map(toHourlyNaqi),
    bestWindow: findBestWindow(upcoming),
    worstWindow: findWorstWindow(upcoming),
    dayMeanPm25: roundTo(dayMean, DISPLAY_DECIMALS.concentration),
  };
}
