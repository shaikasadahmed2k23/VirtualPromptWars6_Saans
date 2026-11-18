import {
  DEFAULT_WINDOW_HOURS,
  DISPLAY_DECIMALS,
  HOURS_PER_DAY,
  WAKING_HOURS,
  type HourlyAirSample,
  type OutdoorWindow,
} from '@saans/shared';

import { DomainError } from './domain-error.js';
import { epochHourToLocal, localEpochHour, localToEpochMs } from './local-time.js';
import { categoryForIndex, computeNaqi } from './naqi.js';
import { roundTo } from './rounding.js';

/** Shape of the window to search for, in local hours of day. */
export interface WindowOptions {
  /** Window length in whole hours. */
  readonly lengthHours: number;
  /** First hour of day a window may start (inclusive). */
  readonly wakingStart: number;
  /** Hour of day by which a window must have ended (exclusive). */
  readonly wakingEnd: number;
}

/** Product defaults: a 2-hour window between 06:00 and 22:00. */
export const DEFAULT_WINDOW_OPTIONS: WindowOptions = {
  lengthHours: DEFAULT_WINDOW_HOURS,
  wakingStart: WAKING_HOURS.start,
  wakingEnd: WAKING_HOURS.end,
};

interface ScoredHour {
  readonly epochHour: number;
  readonly hourOfDay: number;
  readonly naqi: number;
  readonly pm25: number;
  readonly severe: boolean;
}

interface Candidate {
  readonly first: ScoredHour;
  readonly mean: number;
  readonly meanPm25: number;
}

type IsBetter = (candidate: number, current: number) => boolean;

const isHour = (value: number, max: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= max;

function assertValidOptions({ lengthHours, wakingStart, wakingEnd }: WindowOptions): void {
  const valid =
    isHour(wakingStart, HOURS_PER_DAY) && isHour(wakingEnd, HOURS_PER_DAY) && lengthHours >= 1;
  if (!valid || !Number.isInteger(lengthHours) || wakingEnd <= wakingStart) {
    throw new DomainError(
      'INVALID_INPUT',
      `invalid window options: length ${String(lengthHours)}h, waking ${String(wakingStart)}–${String(wakingEnd)}`,
    );
  }
}

function scoreHours(samples: readonly HourlyAirSample[]): ScoredHour[] {
  return samples
    .map((sample) => {
      const naqi = computeNaqi(sample);
      return {
        epochHour: localEpochHour(sample.time),
        hourOfDay: new Date(localToEpochMs(sample.time)).getUTCHours(),
        naqi: naqi.value,
        pm25: sample.pm25,
        severe: naqi.category === 'severe',
      };
    })
    .sort((a, b) => a.epochHour - b.epochHour);
}

function candidateWindows(hours: readonly ScoredHour[], options: WindowOptions): Candidate[] {
  const { lengthHours, wakingStart, wakingEnd } = options;
  return hours.flatMap((first, index) => {
    const slice = hours.slice(index, index + lengthHours);
    const contiguous = slice.every((hour, offset) => hour.epochHour === first.epochHour + offset);
    const inWakingHours =
      first.hourOfDay >= wakingStart && first.hourOfDay + lengthHours <= wakingEnd;
    if (slice.length < lengthHours || !contiguous || !inWakingHours) {
      return [];
    }
    const mean = slice.reduce((sum, hour) => sum + hour.naqi, 0) / lengthHours;
    const meanPm25 = slice.reduce((sum, hour) => sum + hour.pm25, 0) / lengthHours;
    return [{ first, mean, meanPm25 }];
  });
}

function everyWakingHourSevere(hours: readonly ScoredHour[], options: WindowOptions): boolean {
  return hours
    .filter((hour) => hour.hourOfDay >= options.wakingStart && hour.hourOfDay < options.wakingEnd)
    .every((hour) => hour.severe);
}

function selectWindow(
  samples: readonly HourlyAirSample[],
  options: WindowOptions,
  isBetter: IsBetter,
): OutdoorWindow | null {
  assertValidOptions(options);
  const hours = scoreHours(samples);
  const chosen = candidateWindows(hours, options).reduce<Candidate | null>(
    (best, candidate) => (best === null || isBetter(candidate.mean, best.mean) ? candidate : best),
    null,
  );
  if (chosen === null) {
    return null;
  }
  const meanNaqi = roundTo(chosen.mean, DISPLAY_DECIMALS.naqi);
  return {
    start: epochHourToLocal(chosen.first.epochHour),
    end: epochHourToLocal(chosen.first.epochHour + options.lengthHours),
    hours: options.lengthHours,
    meanNaqi,
    meanPm25: roundTo(chosen.meanPm25, DISPLAY_DECIMALS.concentration),
    category: categoryForIndex(meanNaqi),
    allUnsafe: everyWakingHourSevere(hours, options),
  };
}

/**
 * Finds the contiguous waking-hours window with the lowest mean NAQI.
 * Windows never span missing hours; on ties the earliest window wins.
 * @param samples - Hourly forecast for the day being planned, in any order.
 * @param options - Window length and waking hours; defaults to 2 h within 06:00–22:00.
 * @returns The best window (with `allUnsafe` set when every waking hour is Severe), or null
 *   when no complete window fits the forecast.
 * @throws {DomainError} When options are invalid or a sample has invalid concentrations.
 */
export function findBestWindow(
  samples: readonly HourlyAirSample[],
  options: WindowOptions = DEFAULT_WINDOW_OPTIONS,
): OutdoorWindow | null {
  return selectWindow(samples, options, (candidate, current) => candidate < current);
}

/**
 * Finds the contiguous waking-hours window with the highest mean NAQI — the time to stay in.
 * Windows never span missing hours; on ties the earliest window wins.
 * @param samples - Hourly forecast for the day being planned, in any order.
 * @param options - Window length and waking hours; defaults to 2 h within 06:00–22:00.
 * @returns The worst window, or null when no complete window fits the forecast.
 * @throws {DomainError} When options are invalid or a sample has invalid concentrations.
 */
export function findWorstWindow(
  samples: readonly HourlyAirSample[],
  options: WindowOptions = DEFAULT_WINDOW_OPTIONS,
): OutdoorWindow | null {
  return selectWindow(samples, options, (candidate, current) => candidate > current);
}
