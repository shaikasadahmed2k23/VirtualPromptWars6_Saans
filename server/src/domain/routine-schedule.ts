import { relativeDay, type RoutineBlock, type ScheduledRoutineBlock } from '@saans/shared';

import { addHours } from './local-time.js';

const DATE_LENGTH = 'YYYY-MM-DD'.length;
const HOURS_PER_DAY = 24;

interface Placed {
  readonly block: RoutineBlock;
  /** When this run of the block begins, `YYYY-MM-DDTHH:MM`; may already be past if it is under way. */
  readonly startsAt: string;
}

// The next run of a block that has not yet finished: today's if it ends after now, else tomorrow's.
function place(block: RoutineBlock, localNow: string): Placed {
  const date = localNow.slice(0, DATE_LENGTH);
  const startsToday = `${date}T${block.start}`;
  const endsToday = `${date}T${block.end}`;
  const endsAt = block.end <= block.start ? addHours(endsToday, HOURS_PER_DAY) : endsToday;
  return endsAt > localNow
    ? { block, startsAt: startsToday }
    : { block, startsAt: addHours(startsToday, HOURS_PER_DAY) };
}

/**
 * Puts routine blocks (which carry only a clock time) on the calendar and orders them from now.
 * A block still under way counts as today; one that has finished today comes up tomorrow.
 * @param blocks - Blocks in any order, times in the location's local time.
 * @param localNow - Current local time at the location, `YYYY-MM-DDTHH:MM` (not the server's clock).
 * @returns The blocks sorted by when their next run starts, each labelled today or tomorrow.
 */
export function scheduleRoutine(
  blocks: readonly RoutineBlock[],
  localNow: string,
): ScheduledRoutineBlock[] {
  return blocks
    .map((block) => place(block, localNow))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map(({ block, startsAt }) => ({ ...block, day: relativeDay(startsAt, localNow) }));
}
