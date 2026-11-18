import { describe, expect, it } from 'vitest';

import type { HourlyAirSample } from '@saans/shared';

import { buildAirSnapshot } from './air-snapshot.js';

// Two days of hourly data: PM2.5 30 (NAQI 50) except 120 (NAQI 300) from 08:00 to 10:00.
const twoDays: HourlyAirSample[] = Array.from({ length: 48 }, (_, index) => {
  const day = index < 24 ? '18' : '19';
  const hour = String(index % 24).padStart(2, '0');
  const polluted = index % 24 >= 8 && index % 24 < 10;
  return { time: `2026-11-${day}T${hour}:00`, pm25: polluted ? 120 : 30, pm10: 0 };
});

describe('buildAirSnapshot', () => {
  it('reports the current hour, the rest of the forecast and windows for the next 24 h', () => {
    const snapshot = buildAirSnapshot([...twoDays].reverse(), '2026-11-18T07:40');
    expect(snapshot?.current).toMatchObject({
      time: '2026-11-18T07:00',
      value: 50,
      category: 'good',
    });
    expect(snapshot?.hourly).toHaveLength(41);
    expect(snapshot?.hourly[0]).toEqual({
      time: '2026-11-18T07:00',
      pm25: 30,
      pm10: 0,
      naqi: 50,
      category: 'good',
    });
    expect(snapshot?.worstWindow).toMatchObject({ start: '2026-11-18T08:00', meanNaqi: 300 });
    expect(snapshot?.bestWindow?.start).toBe('2026-11-18T10:00');
    // 24 upcoming hours, two of them at 120: (22 × 30 + 2 × 120) / 24 = 37.5.
    expect(snapshot?.dayMeanPm25).toBe(37.5);
  });

  it('falls back to the latest earlier hour when the current hour is missing', () => {
    const withGap = twoDays.filter((sample) => sample.time !== '2026-11-18T07:00');
    expect(buildAirSnapshot(withGap, '2026-11-18T07:10')?.current.time).toBe('2026-11-18T06:00');
  });

  it('uses the first hour when the whole forecast is in the future', () => {
    const snapshot = buildAirSnapshot(twoDays, '2026-11-17T12:00');
    expect(snapshot?.current.time).toBe('2026-11-18T00:00');
  });

  it('uses the current hour for the daily mean when nothing is left in the next 24 h', () => {
    const snapshot = buildAirSnapshot(twoDays.slice(0, 1), '2026-11-18T05:00');
    expect(snapshot?.dayMeanPm25).toBe(30);
    expect(snapshot?.bestWindow).toBeNull();
  });

  it('returns null for an empty forecast', () => {
    expect(buildAirSnapshot([], '2026-11-18T07:00')).toBeNull();
  });
});
