import { createHash } from 'node:crypto';

import type {
  GeoPlace,
  Location,
  PlanContent,
  PlanResponse,
  PlanSource,
  UserProfile,
} from '@saans/shared';

import { startOfHour } from '../domain/local-time.js';
import type { Clock } from '../lib/clock.js';
import { NotFoundError } from '../lib/errors.js';
import type { TtlCache } from '../lib/ttl-cache.js';
import { deriveImpacts } from '../plan/candidate-impacts.js';
import { PLAN_COPY } from '../plan/copy/copies.js';
import type { PlanContext, PlanGenerator } from '../plan/plan-generator.js';
import { toPromptProfile } from '../plan/prompt.js';
import { explainImpact } from '../plan/rule-based-plan-generator.js';
import { roundCoordinates, type Coordinates } from '../providers/aqi-provider.js';
import type { GeocodingProvider } from '../providers/geocoding-provider.js';

import type { AirService, LocatedSnapshot } from './air-service.js';

const MS_PER_HOUR = 3_600_000;

/** Plans are keyed by the hour, so an hour is the longest a cached plan can be valid. */
export const PLAN_CACHE_TTL_MS = MS_PER_HOUR;
/** Upper bound on cached plans. */
export const PLAN_CACHE_MAX_ENTRIES = 500;

/** The one log method the service needs. */
export interface WarnLogger {
  warn: (details: object, message: string) => void;
}

/** Collaborators of {@link PlanService}, all injected. */
export interface PlanServiceDeps {
  readonly air: AirService;
  readonly geocoder: GeocodingProvider;
  /** Gemini-backed generator, or null when no API key is configured. */
  readonly aiGenerator: PlanGenerator | null;
  readonly fallbackGenerator: PlanGenerator;
  readonly cache: TtlCache<string, PlanResponse>;
  readonly clock: Clock;
  readonly logger: WarnLogger;
}

interface Place extends Coordinates {
  readonly label: string;
}

const coordinatesLabel = ({ latitude, longitude }: Coordinates): string =>
  `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

const placeLabel = ({ name, region, country }: GeoPlace): string =>
  [...new Set([name, region, country].filter((part): part is string => part !== null))].join(', ');

/**
 * Cache key for a plan: the normalized profile at its rounded location, for one local hour.
 * @param profile - Validated profile.
 * @param place - Resolved coordinates.
 * @param localTime - Local time at the location.
 * @returns A hex SHA-256 digest.
 */
export function planCacheKey(profile: UserProfile, place: Coordinates, localTime: string): string {
  const normalized = { ...profile, location: roundCoordinates(place) };
  return createHash('sha256')
    .update(JSON.stringify({ profile: normalized, hour: startOfHour(localTime) }))
    .digest('hex');
}

/** Orchestrates a plan: location → forecast → domain numbers → AI text (or fallback). */
export class PlanService {
  /** @param deps - Injected collaborators. */
  constructor(private readonly deps: PlanServiceDeps) {}

  /**
   * Builds (or serves from cache) today's plan for a household.
   * @param profile - Validated profile.
   * @returns The full plan; `source` says whether Gemini or the fallback wrote the text.
   * @throws {NotFoundError} When a city name matches no place.
   * @throws {UpstreamError} When geocoding or the air-quality forecast is unavailable.
   */
  async createPlan(profile: UserProfile): Promise<PlanResponse> {
    const place = await this.resolvePlace(profile.location);
    const snapshot = await this.deps.air.getSnapshot({
      latitude: place.latitude,
      longitude: place.longitude,
    });
    const key = planCacheKey(profile, place, snapshot.localTime);
    return this.deps.cache.getOrLoad(key, () => this.buildPlan(profile, place, snapshot));
  }

  private async resolvePlace(location: Location): Promise<Place> {
    if (location.kind === 'coords') {
      const rounded = roundCoordinates(location);
      return { ...rounded, label: location.label ?? coordinatesLabel(rounded) };
    }
    const [match] = await this.deps.geocoder.search(location.name);
    if (match === undefined) {
      throw new NotFoundError('We could not find that city. Try a nearby larger city.');
    }
    return { latitude: match.latitude, longitude: match.longitude, label: placeLabel(match) };
  }

  private async buildPlan(
    profile: UserProfile,
    place: Place,
    snapshot: LocatedSnapshot,
  ): Promise<PlanResponse> {
    const { bestWindow, worstWindow, dayMeanPm25 } = snapshot;
    const { time: _time, ...currentAqi } = snapshot.current;
    const impacts = deriveImpacts({ profile, bestWindow, worstWindow, dayMeanPm25 });
    const context: PlanContext = {
      language: profile.language,
      locationLabel: place.label,
      localTime: snapshot.localTime,
      currentAqi,
      bestWindow,
      worstWindow,
      impacts,
      profile: toPromptProfile(profile),
    };
    const { content, source } = await this.generate(context);
    const { impactExplanations, ...words } = content;
    const titles = PLAN_COPY[profile.language].impacts;
    return {
      ...words,
      location: { label: place.label, latitude: place.latitude, longitude: place.longitude },
      generatedAt: new Date(this.deps.clock.now()).toISOString(),
      currentAqi,
      bestWindow,
      worstWindow,
      impacts: impacts.map((facts) => ({
        ...facts,
        title: titles[facts.id].title,
        explanation: impactExplanations[facts.id] ?? explainImpact(facts, context),
      })),
      source,
      language: profile.language,
    };
  }

  private async generate(
    context: PlanContext,
  ): Promise<{ content: PlanContent; source: PlanSource }> {
    const { aiGenerator, fallbackGenerator, logger } = this.deps;
    if (aiGenerator !== null) {
      try {
        return { content: await aiGenerator.generate(context), source: 'ai' };
      } catch (error) {
        logger.warn({ err: error }, 'AI plan failed; serving the offline plan');
      }
    }
    return { content: await fallbackGenerator.generate(context), source: 'fallback' };
  }
}
