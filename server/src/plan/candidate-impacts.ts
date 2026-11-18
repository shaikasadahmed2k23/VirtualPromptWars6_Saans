import {
  AVERAGE_COMMUTE_SPEED_KMH,
  COMMUTE_EXPOSURE,
  MINUTES_PER_HOUR,
  OVERNIGHT_INDOOR_HOURS,
  TRIPS_PER_OFFICE_DAY,
  type CommuteMode,
  type OutdoorWindow,
  type UserProfile,
} from '@saans/shared';

import { co2Saved, exposureAvoided, type DoseInput } from '../domain/impact.js';

import type { ImpactId, KnownImpactFacts } from './plan-generator.js';

/** Inputs for {@link deriveImpacts}; all numbers come from the domain layer. */
export interface ImpactInputs {
  readonly profile: UserProfile;
  readonly bestWindow: OutdoorWindow | null;
  readonly worstWindow: OutdoorWindow | null;
  /** Mean PM2.5 over the next 24 hours, µg/m³. */
  readonly dayMeanPm25: number;
}

// Modes worth switching away from: the metro is cleaner for both CO2 and exposure.
const SWITCHABLE_MODES: ReadonlySet<CommuteMode> = new Set(['petrolCar', 'twoWheeler', 'bus']);

type Facts = KnownImpactFacts | null;

const facts = (
  id: ImpactId,
  category: KnownImpactFacts['category'],
  impact: Pick<KnownImpactFacts, 'exposureAvoided' | 'co2SavedKgPerWeek'>,
): KnownImpactFacts => ({ id, category, ...impact });

const commutesToOffice = ({ work, commute }: UserProfile): boolean =>
  work.location !== 'home' && work.officeDaysPerWeek > 0 && commute.distanceKm > 0;

// One office day: there and back, at the average commute speed.
const commuteDose = ({ commute }: UserProfile, pm25: number, mode: CommuteMode): DoseInput => ({
  pm25,
  hours: (commute.distanceKm * TRIPS_PER_OFFICE_DAY) / AVERAGE_COMMUTE_SPEED_KMH,
  ...COMMUTE_EXPOSURE[mode],
});

function commuteMetro(profile: UserProfile, pm25: number): Facts {
  const { mode, distanceKm } = profile.commute;
  if (!commutesToOffice(profile) || !SWITCHABLE_MODES.has(mode)) {
    return null;
  }
  return facts('commute-metro', 'commute', {
    exposureAvoided: exposureAvoided(
      commuteDose(profile, pm25, mode),
      commuteDose(profile, pm25, 'metro'),
    ),
    co2SavedKgPerWeek: co2Saved({
      distanceKm,
      tripsPerWeek: profile.work.officeDaysPerWeek * TRIPS_PER_OFFICE_DAY,
      fromMode: mode,
      toMode: 'metro',
    }),
  });
}

function commuteN95(profile: UserProfile, pm25: number): Facts {
  const baseline = commuteDose(profile, pm25, profile.commute.mode);
  if (!commutesToOffice(profile) || baseline.protection !== 'none') {
    return null;
  }
  return facts('commute-n95', 'commute', {
    exposureAvoided: exposureAvoided(baseline, { ...baseline, protection: 'n95' }),
    co2SavedKgPerWeek: null,
  });
}

function exercise(inputs: ImpactInputs): Facts {
  const { profile, bestWindow, worstWindow, dayMeanPm25 } = inputs;
  const { timing, minutesPerDay } = profile.exercise;
  if (timing === 'none' || minutesPerDay === 0 || bestWindow === null || worstWindow === null) {
    return null;
  }
  const hours = minutesPerDay / MINUTES_PER_HOUR;
  if (bestWindow.allUnsafe) {
    const outdoors: DoseInput = {
      pm25: dayMeanPm25,
      hours,
      activity: 'moderate',
      protection: 'none',
    };
    const protection = profile.hasPurifier ? 'indoorHepa' : 'indoorClosed';
    return facts('exercise-indoors', 'routine', {
      exposureAvoided: exposureAvoided(outdoors, { ...outdoors, protection }),
      co2SavedKgPerWeek: null,
    });
  }
  if (bestWindow.start === worstWindow.start) {
    return null;
  }
  const atWorst: DoseInput = {
    pm25: worstWindow.meanPm25,
    hours,
    activity: 'moderate',
    protection: 'none',
  };
  return facts('exercise-shift', 'routine', {
    exposureAvoided: exposureAvoided(atWorst, { ...atWorst, pm25: bestWindow.meanPm25 }),
    co2SavedKgPerWeek: null,
  });
}

function closeWindows({ worstWindow }: ImpactInputs): Facts {
  if (worstWindow === null) {
    return null;
  }
  const open: DoseInput = {
    pm25: worstWindow.meanPm25,
    hours: worstWindow.hours,
    activity: 'rest',
    protection: 'none',
  };
  return facts('close-windows', 'indoor', {
    exposureAvoided: exposureAvoided(open, { ...open, protection: 'indoorClosed' }),
    co2SavedKgPerWeek: null,
  });
}

function purifier({ profile, dayMeanPm25 }: ImpactInputs): KnownImpactFacts {
  const closed: DoseInput = {
    pm25: dayMeanPm25,
    hours: OVERNIGHT_INDOOR_HOURS,
    activity: 'rest',
    protection: 'indoorClosed',
  };
  return facts(profile.hasPurifier ? 'purifier-run' : 'purifier-buy', 'indoor', {
    exposureAvoided: exposureAvoided(closed, { ...closed, protection: 'indoorHepa' }),
    co2SavedKgPerWeek: null,
  });
}

/**
 * Picks the recommendations relevant to this household and computes their impact.
 * Exposure figures are per person: per office day for commute items, per day otherwise.
 * @param inputs - Profile, today's windows and the 24-hour mean PM2.5.
 * @returns Relevant impacts in display order; never includes one that does not apply.
 * @throws {DomainError} When a computed input is invalid (e.g. a negative concentration).
 */
export function deriveImpacts(inputs: ImpactInputs): KnownImpactFacts[] {
  const { profile, dayMeanPm25 } = inputs;
  return [
    commuteMetro(profile, dayMeanPm25),
    commuteN95(profile, dayMeanPm25),
    exercise(inputs),
    closeWindows(inputs),
    purifier(inputs),
  ].filter((item): item is KnownImpactFacts => item !== null);
}
