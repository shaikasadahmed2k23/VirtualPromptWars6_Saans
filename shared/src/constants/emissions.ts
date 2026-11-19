/** Commute modes and the CO2 factors used to estimate emissions saved by switching. */

/** Commute modes a household can report or switch to. */
export const COMMUTE_MODES = [
  'petrolCar',
  'twoWheeler',
  'autoRickshaw',
  'bus',
  'metro',
  'walk',
  'cycle',
] as const;

/** One of {@link COMMUTE_MODES}. */
export type CommuteMode = (typeof COMMUTE_MODES)[number];

/**
 * CO2 in kg per passenger-km for each commute mode (estimates). Source for every motorised
 * mode: TERI, "Per passenger emission in Delhi – Different Modes"
 * (teriin.org/sites/default/transport/Per_passenger_emission_in_Delhi_Different_Modes.pdf),
 * g CO2/passenger-km ÷ 1000. TERI's public-transport data is for 2019-20, i.e. pre-COVID.
 */
export const CO2_KG_PER_PASSENGER_KM = {
  // TERI: private car, weighted across fuels, 87.73 g/pkm.
  petrolCar: 0.08773,
  // TERI: two-wheeler, 41.29 g/pkm.
  twoWheeler: 0.04129,
  // TERI: CNG auto-rickshaw, 64.10 g/pkm.
  autoRickshaw: 0.0641,
  // TERI: bus, 29.48 g/pkm.
  bus: 0.02948,
  // TERI: metro, 29.29 g/pkm (TERI's upper bound, so savings from metro are conservative).
  metro: 0.02929,
  // No direct emissions; lifecycle emissions excluded.
  walk: 0,
  // No direct emissions; lifecycle emissions excluded.
  cycle: 0,
} as const satisfies Record<CommuteMode, number>;

/**
 * Smallest weekly CO2 saving worth showing for a commute switch, in kg. Below this the figure is
 * noise (for example bus to metro with TERI's factors saves about 0.02 kg a week), so the CO2 line
 * is hidden and the switch is judged on exposure alone.
 */
export const MIN_REPORTED_CO2_KG_PER_WEEK = 0.5;

/** Each office day is a return trip. */
export const TRIPS_PER_OFFICE_DAY = 2;
