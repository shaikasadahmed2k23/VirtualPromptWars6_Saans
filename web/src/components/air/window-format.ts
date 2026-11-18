import type { OutdoorWindow } from '@saans/shared';

const CLOCK_START = 'YYYY-MM-DDT'.length;

/**
 * The `HH:MM` part of a local date-time.
 * @param localTime - `YYYY-MM-DDTHH:MM`.
 * @returns `HH:MM`.
 */
export function clockOf(localTime: string): string {
  return localTime.slice(CLOCK_START);
}

/**
 * A window as `HH:MM–HH:MM`.
 * @param window - Outdoor window.
 * @returns The time span.
 */
export function windowSpan(window: OutdoorWindow): string {
  return `${clockOf(window.start)}–${clockOf(window.end)}`;
}

/**
 * Whether an hour falls inside a window (start inclusive, end exclusive).
 * @param time - Hour start, `YYYY-MM-DDTHH:MM`.
 * @param window - The window, or null.
 * @returns True when the hour is part of the window.
 */
export function inWindow(time: string, window: OutdoorWindow | null): boolean {
  return window !== null && time >= window.start && time < window.end;
}
