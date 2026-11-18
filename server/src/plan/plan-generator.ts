import type {
  ImpactFacts,
  Language,
  NaqiResult,
  OutdoorWindow,
  PlanContent,
  UserProfile,
} from '@saans/shared';

/** Stable ids of every recommendation the planner can compute numbers for. */
export const IMPACT_IDS = [
  'commute-metro',
  'commute-n95',
  'exercise-shift',
  'exercise-indoors',
  'close-windows',
  'purifier-run',
  'purifier-buy',
] as const;

/** One of {@link IMPACT_IDS}. */
export type ImpactId = (typeof IMPACT_IDS)[number];

/** {@link ImpactFacts} whose id is known to be one of {@link IMPACT_IDS}. */
export type KnownImpactFacts = ImpactFacts & { readonly id: ImpactId };

/** The profile as shown to a generator: no exact location, free text cleaned. */
export type PromptProfile = Omit<UserProfile, 'location'>;

/** Everything a generator may use. Every number in here was computed deterministically. */
export interface PlanContext {
  readonly language: Language;
  readonly locationLabel: string;
  /** Local time at the location, `YYYY-MM-DDTHH:MM`. */
  readonly localTime: string;
  readonly currentAqi: NaqiResult;
  readonly bestWindow: OutdoorWindow | null;
  readonly worstWindow: OutdoorWindow | null;
  readonly impacts: readonly KnownImpactFacts[];
  readonly profile: PromptProfile;
}

/** Writes the words of a plan from a {@link PlanContext}. */
export interface PlanGenerator {
  /**
   * Produces the plan text.
   * @throws {UpstreamError} When the generator cannot produce valid content.
   */
  generate(context: PlanContext): Promise<PlanContent>;
}
