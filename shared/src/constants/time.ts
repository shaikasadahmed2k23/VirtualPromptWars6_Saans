/** Time units and the daily schedule the outdoor windows are fitted into. */

/** Hours in a day; bounds hour-of-day inputs. */
export const HOURS_PER_DAY = 24;

/** Minutes in an hour; converts exercise minutes to hours. */
export const MINUTES_PER_HOUR = 60;

/** Unit conversion: milliseconds in a second. */
export const MS_PER_SECOND = 1000;

/** Unit conversion: milliseconds in a minute. */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Unit conversion: milliseconds in an hour. */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Days in a week; bounds office-days input. */
export const DAYS_PER_WEEK = 7;

/** Hours of the day (local, [start, end)) during which outdoor windows are suggested. */
export const WAKING_HOURS = {
  // Product assumption: typical family day runs 06:00–22:00.
  start: 6,
  end: 22,
} as const;

/** Product default: length in hours of a suggested outdoor window. */
export const DEFAULT_WINDOW_HOURS = 2;
