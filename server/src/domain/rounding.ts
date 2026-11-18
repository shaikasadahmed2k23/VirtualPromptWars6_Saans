import type { Coordinates } from '@saans/shared';

const DECIMAL_BASE = 10;
// 2 dp is about 1 km: the granularity forecasts are cached, queried and labelled at.
const COORDINATE_DECIMALS = 2;

/**
 * The one rounding helper for domain output. Calculations stay unrounded until they
 * produce a final value, which is rounded exactly once here.
 * @param value - Non-negative value to round.
 * @param decimals - Number of decimal places to keep.
 * @returns `value` rounded half-up to `decimals` places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = DECIMAL_BASE ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Rounds coordinates to 2 decimal places (~1 km). Nearby requests then share one cached forecast
 * and one cached plan, and exact positions never reach a log line or a label.
 * @param coordinates - Exact coordinates.
 * @returns Rounded coordinates.
 */
export function roundCoordinates(coordinates: Coordinates): Coordinates {
  return {
    latitude: Number(coordinates.latitude.toFixed(COORDINATE_DECIMALS)),
    longitude: Number(coordinates.longitude.toFixed(COORDINATE_DECIMALS)),
  };
}
