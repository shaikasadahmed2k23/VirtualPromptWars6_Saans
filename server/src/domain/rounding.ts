const DECIMAL_BASE = 10;

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
