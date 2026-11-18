/**
 * The one place that knows the layout of a local wall-clock time, `YYYY-MM-DDTHH:MM` (the format
 * Open-Meteo returns with `timezone=auto`). Everything else asks these helpers for its parts
 * instead of slicing the string itself.
 */

const DATE_END = 'YYYY-MM-DD'.length;
const CLOCK_START = 'YYYY-MM-DDT'.length;
const HOUR_END = 'YYYY-MM-DDTHH'.length;
const MINUTE_END = 'YYYY-MM-DDTHH:MM'.length;

/**
 * The calendar date of a local time.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `YYYY-MM-DD`.
 */
export function localDate(localTime: string): string {
  return localTime.slice(0, DATE_END);
}

/**
 * The time-of-day part of a local time.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `HH:MM`.
 */
export function clockTime(localTime: string): string {
  return localTime.slice(CLOCK_START, MINUTE_END);
}

/**
 * The two-digit hour of a local time, as written (no parsing).
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `HH`.
 */
export function clockHour(localTime: string): string {
  return localTime.slice(CLOCK_START, HOUR_END);
}

/**
 * Truncates a local time to the start of its hour.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `YYYY-MM-DDTHH:00`.
 */
export function startOfHour(localTime: string): string {
  return `${localTime.slice(0, HOUR_END)}:00`;
}

/**
 * Keeps only the minute-precision prefix, dropping any seconds or offset.
 * @param localTime - `YYYY-MM-DDTHH:MM`, possibly followed by more.
 * @returns `YYYY-MM-DDTHH:MM`.
 */
export function toMinutePrecision(localTime: string): string {
  return localTime.slice(0, MINUTE_END);
}
