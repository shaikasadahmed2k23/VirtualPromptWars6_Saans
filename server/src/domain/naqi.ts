import {
  DISPLAY_DECIMALS,
  NAQI_ADVISORIES,
  NAQI_BREAKPOINTS,
  NAQI_CATEGORIES,
  NAQI_INDEX_BANDS,
  NAQI_MAX_INDEX,
  type NaqiCategory,
  type NaqiResult,
  type Pollutant,
} from '@saans/shared';

import { assertNonNegativeFinite } from './domain-error.js';
import { roundTo } from './rounding.js';

/** Appended to every advisory: hourly readings are not the official 24-hour NAQI. */
export const INDICATIVE_NOTE =
  'Indicative value from hourly data; the official NAQI uses a 24-hour average.';

/** PM2.5 and PM10 concentrations in µg/m³. */
export interface Concentrations {
  readonly pm25: number;
  readonly pm10: number;
}

/**
 * CPCB sub-index for one pollutant, linearly interpolated within its band.
 * Concentrations between two integer breakpoints (e.g. PM2.5 30.5) take the lower
 * edge of the upper band. Severe uses an assumed upper breakpoint and caps at 500.
 * @param pollutant - Which pollutant the concentration is for.
 * @param concentration - Concentration in µg/m³.
 * @returns The unrounded sub-index, 0–500.
 * @throws {DomainError} When the concentration is negative, NaN or infinite.
 */
export function subIndex(pollutant: Pollutant, concentration: number): number {
  assertNonNegativeFinite(pollutant, concentration);
  const band = NAQI_BREAKPOINTS[pollutant].find(({ concHi }) => concentration <= concHi);
  if (band === undefined) {
    return NAQI_MAX_INDEX;
  }
  const { indexLo, indexHi } = NAQI_INDEX_BANDS[band.category];
  const clamped = Math.max(concentration, band.concLo);
  const slope = (indexHi - indexLo) / (band.concHi - band.concLo);
  return indexLo + (clamped - band.concLo) * slope;
}

/**
 * Maps an index value to its NAQI category.
 * @param value - NAQI value.
 * @returns The first category whose upper bound is at least `value`; Severe above 500.
 */
export function categoryForIndex(value: number): NaqiCategory {
  return (
    NAQI_CATEGORIES.find((category) => value <= NAQI_INDEX_BANDS[category].indexHi) ?? 'severe'
  );
}

/**
 * Overall NAQI: the larger of the PM2.5 and PM10 sub-indices (PM2.5 wins ties).
 * @param concentrations - PM2.5 and PM10 in µg/m³.
 * @returns Rounded value, category, dominant pollutant and an indicative advisory.
 * @throws {DomainError} When either concentration is negative, NaN or infinite.
 */
export function computeNaqi(concentrations: Concentrations): NaqiResult {
  const pm25Index = subIndex('pm25', concentrations.pm25);
  const pm10Index = subIndex('pm10', concentrations.pm10);
  const dominantPollutant: Pollutant = pm10Index > pm25Index ? 'pm10' : 'pm25';
  const value = roundTo(Math.max(pm25Index, pm10Index), DISPLAY_DECIMALS.naqi);
  const category = categoryForIndex(value);
  return {
    value,
    category,
    dominantPollutant,
    // The API's advisory is English; the web UI shows its own language from the same table.
    advisory: `${NAQI_ADVISORIES.en[category]} ${INDICATIVE_NOTE}`,
  };
}
