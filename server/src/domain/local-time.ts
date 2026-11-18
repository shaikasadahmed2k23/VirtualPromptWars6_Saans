/**
 * Arithmetic on the location's local wall-clock times (`YYYY-MM-DDTHH:MM`). Reading such a string
 * as UTC gives a gap-free number line to add and subtract on; formatting back undoes it. Splitting
 * the string into its parts lives in `@saans/shared` (`local-time.ts`).
 */

import { MS_PER_HOUR, MS_PER_SECOND, toMinutePrecision } from '@saans/shared';

const toLocalMs = (localTime: string): number => Date.parse(`${toMinutePrecision(localTime)}Z`);

const fromLocalMs = (epochMs: number): string => toMinutePrecision(new Date(epochMs).toISOString());

/**
 * The location's current local time.
 * @param nowMs - Real current time (epoch ms, UTC).
 * @param utcOffsetSeconds - Location's offset from UTC.
 * @returns `YYYY-MM-DDTHH:MM` in the location's time zone.
 */
export function localTimeAt(nowMs: number, utcOffsetSeconds: number): string {
  return fromLocalMs(nowMs + utcOffsetSeconds * MS_PER_SECOND);
}

/**
 * Shifts a local time by whole hours.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @param hours - Hours to add (may be negative).
 * @returns The shifted `YYYY-MM-DDTHH:MM`.
 */
export function addHours(localTime: string, hours: number): string {
  return fromLocalMs(toLocalMs(localTime) + hours * MS_PER_HOUR);
}

/**
 * Whole hours since the epoch on the "local as UTC" line; consecutive hours differ by 1.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns The hour index.
 */
export function localEpochHour(localTime: string): number {
  return Math.floor(toLocalMs(localTime) / MS_PER_HOUR);
}

/**
 * Formats an hour index from {@link localEpochHour} back to a local time.
 * @param epochHour - Hour index.
 * @returns `YYYY-MM-DDTHH:00`.
 */
export function epochHourToLocal(epochHour: number): string {
  return fromLocalMs(epochHour * MS_PER_HOUR);
}
