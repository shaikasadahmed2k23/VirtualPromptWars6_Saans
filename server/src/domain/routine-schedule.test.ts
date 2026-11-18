import { describe, expect, it } from 'vitest';

import type { RoutineBlock } from '@saans/shared';

import { localTimeAt } from './local-time.js';
import { scheduleRoutine } from './routine-schedule.js';

const IST_OFFSET_SECONDS = 19_800;

const block = (start: string, end: string, title = `${start}-${end}`): RoutineBlock => ({
  start,
  end,
  title,
  advice: 'x',
});

const NIGHT = block('22:00', '06:00', 'night');
const MORNING = block('07:00', '09:00', 'morning');
const AFTERNOON = block('14:00', '16:00', 'afternoon');
const EVENING = block('18:00', '20:00', 'evening');
const ALL = [AFTERNOON, NIGHT, EVENING, MORNING];

const summary = (now: string, blocks: readonly RoutineBlock[] = ALL): string[] =>
  scheduleRoutine(blocks, now).map(({ title, day }) => `${day} ${title}`);

describe('scheduleRoutine', () => {
  it.each([
    [
      'early morning (08:00): the morning block is under way, today',
      '2026-11-18T08:00',
      ['today morning', 'today afternoon', 'today evening', 'today night'],
    ],
    [
      'late afternoon (16:14): the afternoon block has finished, so it is tomorrow',
      '2026-11-18T16:14',
      ['today evening', 'today night', 'tomorrow morning', 'tomorrow afternoon'],
    ],
    [
      'late night (23:30): the 22:00–06:00 block is under way, today',
      '2026-11-18T23:30',
      ['today night', 'tomorrow morning', 'tomorrow afternoon', 'tomorrow evening'],
    ],
  ])('%s', (_label, now, expected) => {
    expect(summary(now)).toEqual(expected);
  });

  it('keeps a block that crosses midnight today until it ends tomorrow morning', () => {
    expect(summary('2026-11-18T03:00', [NIGHT])).toEqual(['today night']);
    expect(summary('2026-11-18T06:00', [NIGHT])).toEqual(['today night']);
  });

  it('puts a block that ends exactly now on the next day', () => {
    expect(summary('2026-11-18T16:00', [AFTERNOON])).toEqual(['tomorrow afternoon']);
  });

  it('is decided by the location’s clock, not the server’s', () => {
    const instant = Date.parse('2026-11-18T10:30:00Z'); // a UTC server reads 10:30; Delhi reads 16:00
    const delhi = localTimeAt(instant, IST_OFFSET_SECONDS);
    const utcWallClock = localTimeAt(instant, 0);
    expect(delhi).toBe('2026-11-18T16:00');
    expect(summary(delhi, [AFTERNOON, EVENING])).toEqual(['today evening', 'tomorrow afternoon']);
    // Using the server's own clock would wrongly say the finished 14:00–16:00 block is still ahead.
    expect(summary(utcWallClock, [AFTERNOON, EVENING])).toEqual([
      'today afternoon',
      'today evening',
    ]);
  });

  it('keeps the original times and text', () => {
    expect(scheduleRoutine([EVENING], '2026-11-18T08:00')).toEqual([{ ...EVENING, day: 'today' }]);
  });

  it('returns nothing for no blocks', () => {
    expect(scheduleRoutine([], '2026-11-18T08:00')).toEqual([]);
  });
});
