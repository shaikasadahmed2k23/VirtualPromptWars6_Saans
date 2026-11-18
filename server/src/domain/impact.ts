import {
  CO2_KG_PER_PASSENGER_KM,
  DISPLAY_DECIMALS,
  INHALATION_RATE_M3_PER_HOUR,
  PERCENT_SCALE,
  PROTECTION_FACTOR,
  type ActivityLevel,
  type CommuteMode,
  type ExposureAvoided,
  type ProtectionLevel,
} from '@saans/shared';

import { assertNonNegativeFinite } from './domain-error.js';
import { roundTo } from './rounding.js';

/** One exposure scenario: how polluted, how long, how hard you breathe, how shielded. */
export interface DoseInput {
  /** Outdoor PM2.5 concentration in µg/m³. */
  readonly pm25: number;
  readonly hours: number;
  readonly activity: ActivityLevel;
  readonly protection: ProtectionLevel;
}

/** A recurring trip and the mode it switches between. */
export interface Co2SavedInput {
  /** One-way trip distance in km. */
  readonly distanceKm: number;
  readonly tripsPerWeek: number;
  readonly fromMode: CommuteMode;
  readonly toMode: CommuteMode;
}

function rawDose({ pm25, hours, activity, protection }: DoseInput): number {
  assertNonNegativeFinite('pm25', pm25);
  assertNonNegativeFinite('hours', hours);
  return pm25 * INHALATION_RATE_M3_PER_HOUR[activity] * hours * PROTECTION_FACTOR[protection];
}

/**
 * Estimated inhaled PM2.5 dose = concentration × inhalation rate × hours × protection factor.
 * @param input - The exposure scenario.
 * @returns Dose in µg, rounded for display.
 * @throws {DomainError} When `pm25` or `hours` is negative, NaN or infinite.
 */
export function inhaledDose(input: DoseInput): number {
  return roundTo(rawDose(input), DISPLAY_DECIMALS.doseMicrograms);
}

/**
 * PM2.5 dose avoided by doing `alternative` instead of `baseline`. Never negative: an
 * alternative that is no better avoids nothing.
 * @param baseline - What the household would do otherwise.
 * @param alternative - The recommended choice.
 * @returns Avoided dose in µg and as a percentage of the baseline dose (0 if baseline is 0).
 * @throws {DomainError} When any concentration or duration is negative, NaN or infinite.
 */
export function exposureAvoided(baseline: DoseInput, alternative: DoseInput): ExposureAvoided {
  const baselineDose = rawDose(baseline);
  const avoided = Math.max(0, baselineDose - rawDose(alternative));
  const fraction = baselineDose === 0 ? 0 : avoided / baselineDose;
  return {
    micrograms: roundTo(avoided, DISPLAY_DECIMALS.doseMicrograms),
    percent: roundTo(fraction * PERCENT_SCALE, DISPLAY_DECIMALS.percent),
  };
}

/**
 * Expresses an avoided dose as hours of breathing the current outdoor air at rest:
 * dose ÷ current PM2.5 ÷ resting inhalation rate.
 * @param avoidedMicrograms - Avoided PM2.5 dose in µg.
 * @param currentPm25 - Current outdoor PM2.5 in µg/m³.
 * @returns Hours, rounded for display; null when the air is clean (0 µg/m³), where the
 *   comparison would be meaningless.
 * @throws {DomainError} When either input is negative, NaN or infinite.
 */
export function restHoursEquivalent(avoidedMicrograms: number, currentPm25: number): number | null {
  assertNonNegativeFinite('avoidedMicrograms', avoidedMicrograms);
  assertNonNegativeFinite('currentPm25', currentPm25);
  if (currentPm25 === 0) {
    return null;
  }
  const hours = avoidedMicrograms / currentPm25 / INHALATION_RATE_M3_PER_HOUR.rest;
  return roundTo(hours, DISPLAY_DECIMALS.hours);
}

/**
 * Weekly tailpipe CO2e saved by switching commute mode. Never negative; same mode saves 0.
 * @param input - Trip distance, weekly trip count and the two modes.
 * @returns kg CO2e saved per week, rounded for display.
 * @throws {DomainError} When distance or trip count is negative, NaN or infinite.
 */
export function co2Saved(input: Co2SavedInput): number {
  const { distanceKm, tripsPerWeek, fromMode, toMode } = input;
  assertNonNegativeFinite('distanceKm', distanceKm);
  assertNonNegativeFinite('tripsPerWeek', tripsPerWeek);
  const perKm = Math.max(0, CO2_KG_PER_PASSENGER_KM[fromMode] - CO2_KG_PER_PASSENGER_KM[toMode]);
  return roundTo(distanceKm * tripsPerWeek * perKm, DISPLAY_DECIMALS.co2Kg);
}
