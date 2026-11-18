import { HOURS_PER_DAY, MS_PER_HOUR } from './constants.js';

/**
 * Which calendar day, at the location, an instant falls on relative to "now". Windows and routine
 * blocks only ever look 24 hours ahead, so two values are enough.
 */
export type RelativeDay = 'today' | 'tomorrow';

const DATE_LENGTH = 'YYYY-MM-DD'.length;
const HOUR_PREFIX_LENGTH = 'YYYY-MM-DDTHH'.length;

// Calendar-day number of a local date-time; only differences between two of them are used.
const dayNumber = (localTime: string): number =>
  Math.floor(
    Date.parse(`${localTime.slice(0, DATE_LENGTH)}T00:00Z`) / (HOURS_PER_DAY * MS_PER_HOUR),
  );

/**
 * Names the calendar day of an instant relative to now, entirely in the location's local time
 * (never the server's clock, which on Render is UTC).
 * @param localTime - Instant to label, `YYYY-MM-DDTHH:MM`.
 * @param localNow - Current local time at the location, `YYYY-MM-DDTHH:MM`.
 * @returns `tomorrow` when `localTime` falls on a later calendar date than `localNow`, else `today`.
 */
export function relativeDay(localTime: string, localNow: string): RelativeDay {
  return dayNumber(localTime) > dayNumber(localNow) ? 'tomorrow' : 'today';
}

/**
 * Whether a window that begins at `start` is already under way (or begins this very hour).
 * @param start - Window start, `YYYY-MM-DDTHH:MM`.
 * @param localNow - Current local time at the location, `YYYY-MM-DDTHH:MM`.
 * @returns True when `start` is at or before the start of the current hour.
 */
export function startsNow(start: string, localNow: string): boolean {
  return start <= `${localNow.slice(0, HOUR_PREFIX_LENGTH)}:00`;
}
