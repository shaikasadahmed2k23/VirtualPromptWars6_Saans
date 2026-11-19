/** CPCB National Air Quality Index (2014): pollutants, categories, index bands and breakpoints. */

/** Pollutants that feed the NAQI calculation. */
export const POLLUTANTS = ['pm25', 'pm10'] as const;

/** One of {@link POLLUTANTS}. */
export type Pollutant = (typeof POLLUTANTS)[number];

/** CPCB NAQI categories, ordered from best to worst. */
export const NAQI_CATEGORIES = [
  'good',
  'satisfactory',
  'moderate',
  'poor',
  'veryPoor',
  'severe',
] as const;

/** One of {@link NAQI_CATEGORIES}. */
export type NaqiCategory = (typeof NAQI_CATEGORIES)[number];

/** Inclusive index range of one NAQI category. */
export interface IndexRange {
  readonly indexLo: number;
  readonly indexHi: number;
}

/** NAQI index range per category (CPCB National Air Quality Index, 2014). */
export const NAQI_INDEX_BANDS = {
  good: { indexLo: 0, indexHi: 50 },
  satisfactory: { indexLo: 51, indexHi: 100 },
  moderate: { indexLo: 101, indexHi: 200 },
  poor: { indexLo: 201, indexHi: 300 },
  veryPoor: { indexLo: 301, indexHi: 400 },
  severe: { indexLo: 401, indexHi: 500 },
} as const satisfies Record<NaqiCategory, IndexRange>;

/** Highest reportable NAQI value; every sub-index is capped here. */
export const NAQI_MAX_INDEX = NAQI_INDEX_BANDS.severe.indexHi;

/**
 * ASSUMPTION: CPCB publishes no upper breakpoint for the Severe band ("250+", "430+").
 * We interpolate 401→500 up to these concentrations (µg/m³) and cap at 500 beyond them.
 */
export const SEVERE_ASSUMED_UPPER_CONCENTRATION = {
  pm25: 380,
  pm10: 510,
} as const satisfies Record<Pollutant, number>;

/** Inclusive concentration range (µg/m³) that maps onto one NAQI category. */
export interface ConcentrationBand {
  readonly category: NaqiCategory;
  readonly concLo: number;
  readonly concHi: number;
}

/** CPCB NAQI breakpoints in µg/m³, 24-hour averages (CPCB National Air Quality Index, 2014). */
export const NAQI_BREAKPOINTS = {
  pm25: [
    { category: 'good', concLo: 0, concHi: 30 },
    { category: 'satisfactory', concLo: 31, concHi: 60 },
    { category: 'moderate', concLo: 61, concHi: 90 },
    { category: 'poor', concLo: 91, concHi: 120 },
    { category: 'veryPoor', concLo: 121, concHi: 250 },
    { category: 'severe', concLo: 250, concHi: SEVERE_ASSUMED_UPPER_CONCENTRATION.pm25 },
  ],
  pm10: [
    { category: 'good', concLo: 0, concHi: 50 },
    { category: 'satisfactory', concLo: 51, concHi: 100 },
    { category: 'moderate', concLo: 101, concHi: 250 },
    { category: 'poor', concLo: 251, concHi: 350 },
    { category: 'veryPoor', concLo: 351, concHi: 430 },
    { category: 'severe', concLo: 430, concHi: SEVERE_ASSUMED_UPPER_CONCENTRATION.pm10 },
  ],
} as const satisfies Record<Pollutant, readonly ConcentrationBand[]>;
