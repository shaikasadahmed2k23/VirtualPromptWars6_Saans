import { clockTime, type OutdoorWindow } from '@saans/shared';

/**
 * A window as `HH:MM–HH:MM`.
 * @param window - Outdoor window.
 * @returns The time span.
 */
export function windowSpan(window: OutdoorWindow): string {
  return `${clockTime(window.start)}–${clockTime(window.end)}`;
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
