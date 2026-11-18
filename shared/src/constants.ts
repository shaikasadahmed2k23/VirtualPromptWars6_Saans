/**
 * Every numeric constant used by the impact model, NAQI engine and input validation.
 * Each value carries a one-line source comment. All impact figures are estimates.
 */

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

/** Commute modes a household can report or switch to. */
export const COMMUTE_MODES = ['petrolCar', 'twoWheeler', 'bus', 'metro', 'walk', 'cycle'] as const;

/** One of {@link COMMUTE_MODES}. */
export type CommuteMode = (typeof COMMUTE_MODES)[number];

/** Tailpipe CO2e in kg per passenger-km for each commute mode (estimates). */
export const CO2_KG_PER_PASSENGER_KM = {
  // UK DESNZ GHG Conversion Factors 2024: average petrol car, single occupant.
  petrolCar: 0.164,
  // UK DESNZ GHG Conversion Factors 2024: average motorbike.
  twoWheeler: 0.114,
  // UK DESNZ GHG Conversion Factors 2024: average local bus, per passenger-km.
  bus: 0.102,
  // UK DESNZ GHG Conversion Factors 2024: London Underground (urban metro proxy), per passenger-km.
  metro: 0.028,
  // No direct emissions; lifecycle emissions excluded.
  walk: 0,
  // No direct emissions; lifecycle emissions excluded.
  cycle: 0,
} as const satisfies Record<CommuteMode, number>;

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

/** Each office day is a return trip. */
export const TRIPS_PER_OFFICE_DAY = 2;

/** Product assumption: hours a household spends asleep indoors, the main purifier window. */
export const OVERNIGHT_INDOOR_HOURS = 8;

/** Minutes in an hour; converts exercise minutes to hours. */
export const MINUTES_PER_HOUR = 60;

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

/** Interface and plan languages. */
export const LANGUAGES = ['en', 'hi'] as const;

/** One of {@link LANGUAGES}. */
export type Language = (typeof LANGUAGES)[number];

/** Household cooking fuels. */
export const COOKING_FUELS = ['lpg', 'png', 'electric', 'biomass', 'kerosene', 'coal'] as const;

/** One of {@link COOKING_FUELS}. */
export type CookingFuel = (typeof COOKING_FUELS)[number];

/** Areas an impact recommendation can belong to. */
export const IMPACT_CATEGORIES = [
  'routine',
  'indoor',
  'commute',
  'cooking',
  'heating',
  'waste',
] as const;

/** One of {@link IMPACT_CATEGORIES}. */
export type ImpactCategory = (typeof IMPACT_CATEGORIES)[number];

/** Who wrote a plan's words: Gemini, or the deterministic offline fallback. */
export const PLAN_SOURCES = ['ai', 'fallback'] as const;

/** One of {@link PLAN_SOURCES}. */
export type PlanSource = (typeof PLAN_SOURCES)[number];

/** Hours of the day (local, [start, end)) during which outdoor windows are suggested. */
export const WAKING_HOURS = {
  // Product assumption: typical family day runs 06:00–22:00.
  start: 6,
  end: 22,
} as const;

/** Product default: length in hours of a suggested outdoor window. */
export const DEFAULT_WINDOW_HOURS = 2;

/** Hours in a day; bounds hour-of-day inputs. */
export const HOURS_PER_DAY = 24;

/** Unit conversion: milliseconds in a second. */
export const MS_PER_SECOND = 1000;

/** Unit conversion: milliseconds in a minute. */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Unit conversion: milliseconds in an hour. */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Days in a week; bounds office-days input. */
export const DAYS_PER_WEEK = 7;

/** Multiplier turning a fraction into a percentage. */
export const PERCENT_SCALE = 100;

/** Display precision, in decimal places, for each kind of computed number. */
export const DISPLAY_DECIMALS = {
  // Product choice: doses shown to 0.1 µg.
  doseMicrograms: 1,
  // Product choice: whole-number percentages.
  percent: 0,
  // Product choice: CO2 shown to 10 g.
  co2Kg: 2,
  // CPCB reports NAQI as an integer.
  naqi: 0,
  // Product choice: concentrations shown to 0.1 µg/m³, as Open-Meteo reports them.
  concentration: 1,
} as const;

/** Validation limits for user-supplied input (product limits, not physical ones). */
export const INPUT_LIMITS = {
  // WGS84 latitude range.
  latitude: 90,
  // WGS84 longitude range.
  longitude: 180,
  cityNameMin: 2,
  cityNameMax: 100,
  householdMembersMax: 20,
  commuteKmMax: 200,
  exerciseMinutesMax: 300,
  notesMax: 500,
  titleMax: 120,
  textMax: 600,
  idMax: 64,
  routineBlocksMax: 12,
  tipsMax: 8,
  impactItemsMax: 20,
  // Upper sanity bound (µg/m³); real-world hourly peaks in Delhi stay below ~1,500.
  concentrationMax: 5000,
} as const;
