/** Inhalation rates, protection factors and commute exposure profiles for the PM2.5 dose model. */

import type { CommuteMode } from './emissions.js';

/** Physical activity levels used to pick an inhalation rate. */
export const ACTIVITY_LEVELS = ['rest', 'light', 'moderate'] as const;

/** One of {@link ACTIVITY_LEVELS}. */
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/** Adult inhalation rate in m³/h by activity level. */
export const INHALATION_RATE_M3_PER_HOUR = {
  // US EPA Exposure Factors Handbook (2011), ch. 6, Table 6-2: sedentary/passive ≈ 0.5 m³/h.
  rest: 0.5,
  // US EPA Exposure Factors Handbook (2011), ch. 6, Table 6-2: light intensity ≈ 1.0 m³/h.
  light: 1.0,
  // US EPA Exposure Factors Handbook (2011), ch. 6, Table 6-2: moderate intensity ≈ 2.5 m³/h.
  moderate: 2.5,
} as const satisfies Record<ActivityLevel, number>;

/** Where a person is and what shields them from outdoor PM2.5. */
export const PROTECTION_LEVELS = ['none', 'indoorClosed', 'indoorHepa', 'n95'] as const;

/** One of {@link PROTECTION_LEVELS}. */
export type ProtectionLevel = (typeof PROTECTION_LEVELS)[number];

/** Fraction of outdoor PM2.5 actually inhaled for each protection level (estimates). */
export const PROTECTION_FACTOR = {
  // Definition: unprotected outdoor exposure is the baseline.
  none: 1,
  // PM2.5 infiltration factor for closed-window homes, ~0.3–0.8 (Chen & Zhao 2011, Atmos. Environ. 45:275).
  indoorClosed: 0.6,
  // Estimate: right-sized HEPA purifier cuts indoor PM2.5 by ~60% (Cheek et al. 2021 review of portable air purifiers).
  indoorHepa: 0.25,
  // Estimate: NIOSH N95 filters ≥95%; 0.1 allows for real-world fit leakage (Grinshpun et al. 2009).
  n95: 0.1,
} as const satisfies Record<ProtectionLevel, number>;

/** How hard a traveller breathes and how shielded they are on each commute mode. */
export interface CommuteExposure {
  readonly activity: ActivityLevel;
  readonly protection: ProtectionLevel;
}

/** Exposure profile per commute mode (product estimates, labelled as such in the UI). */
export const COMMUTE_EXPOSURE = {
  // Estimate: seated in a closed car; cabin air behaves like a closed home.
  petrolCar: { activity: 'rest', protection: 'indoorClosed' },
  // Estimate: riding in open traffic air.
  twoWheeler: { activity: 'light', protection: 'none' },
  // Estimate: seated, with open sides, in traffic air.
  autoRickshaw: { activity: 'rest', protection: 'none' },
  // Estimate: Indian city buses usually run with windows open.
  bus: { activity: 'rest', protection: 'none' },
  // Estimate: closed, air-conditioned coaches.
  metro: { activity: 'rest', protection: 'indoorClosed' },
  walk: { activity: 'light', protection: 'none' },
  cycle: { activity: 'moderate', protection: 'none' },
} as const satisfies Record<CommuteMode, CommuteExposure>;

/**
 * Product assumption: typical door-to-door peak-hour speed in Indian metro cities, used to
 * turn commute distance into time exposed. Labelled as an estimate wherever it is used.
 */
export const AVERAGE_COMMUTE_SPEED_KMH = 20;

/** Product assumption: hours a household spends asleep indoors, the main purifier window. */
export const OVERNIGHT_INDOOR_HOURS = 8;
