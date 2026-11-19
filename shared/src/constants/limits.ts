/** Input validation limits and display precision. */

/** Multiplier turning a fraction into a percentage. */
export const PERCENT_SCALE = 100;

/** Display precision, in decimal places, for each kind of computed number. */
export const DISPLAY_DECIMALS = {
  // Product choice: doses shown to 0.1 µg.
  doseMicrograms: 1,
  // Product choice: hours of breathing shown to 0.1 h.
  hours: 1,
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
