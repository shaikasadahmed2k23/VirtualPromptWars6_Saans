/**
 * Pure helpers for the location's local wall-clock times, written `YYYY-MM-DDTHH:MM`
 * (the format Open-Meteo returns with `timezone=auto`). Reading such a string as UTC
 * gives a gap-free number line for arithmetic; formatting back undoes it.
 */

const MS_PER_HOUR = 3_600_000;
const MS_PER_SECOND = 1000;
const LOCAL_MINUTE_LENGTH = 'YYYY-MM-DDTHH:MM'.length;
const HOUR_PREFIX_LENGTH = 'YYYY-MM-DDTHH'.length;
const CLOCK_TIME_START = 'YYYY-MM-DDT'.length;

/**
 * Converts a local wall-clock string to epoch milliseconds on the "local as UTC" line.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns Milliseconds, comparable and subtractable with other local times.
 */
export function localToEpochMs(localTime: string): number {
  return Date.parse(`${localTime.slice(0, LOCAL_MINUTE_LENGTH)}Z`);
}

/**
 * Formats epoch milliseconds on the "local as UTC" line back to a local wall-clock string.
 * @param epochMs - Milliseconds from {@link localToEpochMs} (plus any offset).
 * @returns `YYYY-MM-DDTHH:MM`.
 */
export function epochMsToLocal(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, LOCAL_MINUTE_LENGTH);
}

/**
 * The location's current local time.
 * @param nowMs - Real current time (epoch ms, UTC).
 * @param utcOffsetSeconds - Location's offset from UTC.
 * @returns `YYYY-MM-DDTHH:MM` in the location's time zone.
 */
export function localTimeAt(nowMs: number, utcOffsetSeconds: number): string {
  return epochMsToLocal(nowMs + utcOffsetSeconds * MS_PER_SECOND);
}

/**
 * Truncates a local time to the start of its hour.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `YYYY-MM-DDTHH:00`.
 */
export function startOfHour(localTime: string): string {
  return `${localTime.slice(0, HOUR_PREFIX_LENGTH)}:00`;
}

/**
 * Shifts a local time by whole hours.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @param hours - Hours to add (may be negative).
 * @returns The shifted `YYYY-MM-DDTHH:MM`.
 */
export function addHours(localTime: string, hours: number): string {
  return epochMsToLocal(localToEpochMs(localTime) + hours * MS_PER_HOUR);
}

/**
 * The time-of-day part of a local time.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `HH:MM`.
 */
export function clockTime(localTime: string): string {
  return localTime.slice(CLOCK_TIME_START, LOCAL_MINUTE_LENGTH);
}

/**
 * Whole hours since the epoch on the "local as UTC" line; consecutive hours differ by 1.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns The hour index.
 */
export function localEpochHour(localTime: string): number {
  return Math.floor(localToEpochMs(localTime) / MS_PER_HOUR);
}

/**
 * Formats an hour index from {@link localEpochHour} back to a local time.
 * @param epochHour - Hour index.
 * @returns `YYYY-MM-DDTHH:00`.
 */
export function epochHourToLocal(epochHour: number): string {
  return epochMsToLocal(epochHour * MS_PER_HOUR);
}
