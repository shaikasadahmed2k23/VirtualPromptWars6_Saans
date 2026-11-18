import { describe, expect, it, vi } from 'vitest';

import {
  planResponseSchema,
  type GeoPlace,
  type PlanContent,
  type PlanResponse,
  type UserProfile,
} from '@saans/shared';

import { NotFoundError, UpstreamError } from '../lib/errors.js';
import { TtlCache } from '../lib/ttl-cache.js';
import type { PlanGenerator } from '../plan/plan-generator.js';
import { RuleBasedPlanGenerator } from '../plan/rule-based-plan-generator.js';
import type { AqiProvider } from '../providers/aqi-provider.js';
import type { GeocodingProvider } from '../providers/geocoding-provider.js';
import { FORECAST_SAMPLES, IST_OFFSET_SECONDS, NOW_MS, PROFILE } from '../test/fixtures.js';

import { AirService } from './air-service.js';
import {
  PLAN_CACHE_MAX_ENTRIES,
  PLAN_CACHE_TTL_MS,
  PlanService,
  planCacheKey,
} from './plan-service.js';

const DELHI: GeoPlace = {
  id: 1,
  name: 'Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.65,
  longitude: 77.23,
};

const aiContent = (impactIds: string[]): PlanContent => ({
  summary: 'AI summary.',
  routine: [],
  indoorHacks: [],
  alternatives: [],
  impactExplanations: Object.fromEntries(impactIds.map((id) => [id, `AI explains ${id}.`])),
});

const setup = (options: { ai?: PlanGenerator | null; samples?: typeof FORECAST_SAMPLES } = {}) => {
  const aqi = {
    getForecast: vi.fn<AqiProvider['getForecast']>(() =>
      Promise.resolve({
        timezone: 'Asia/Kolkata',
        utcOffsetSeconds: IST_OFFSET_SECONDS,
        samples: options.samples ?? FORECAST_SAMPLES,
      }),
    ),
  };
  const geocoder = { search: vi.fn<GeocodingProvider['search']>(() => Promise.resolve([DELHI])) };
  const logger = { warn: vi.fn() };
  const clock = { now: () => NOW_MS };
  const service = new PlanService({
    air: new AirService(aqi, clock),
    geocoder,
    aiGenerator: options.ai ?? null,
    fallbackGenerator: new RuleBasedPlanGenerator(),
    cache: new TtlCache<string, PlanResponse>({
      ttlMs: PLAN_CACHE_TTL_MS,
      maxEntries: PLAN_CACHE_MAX_ENTRIES,
      clock,
    }),
    clock,
    logger,
  });
  return { service, aqi, geocoder, logger };
};

describe('PlanService', () => {
  it('builds a schema-valid fallback plan from coordinates when no AI is configured', async () => {
    const { service, aqi, geocoder } = setup();
    const plan = await service.createPlan(PROFILE);
    expect(planResponseSchema.parse(plan)).toEqual(plan);
    expect(plan.source).toBe('fallback');
    expect(plan.location).toEqual({ label: 'New Delhi', latitude: 28.61, longitude: 77.21 });
    expect(plan.currentAqi.category).toBe('veryPoor');
    expect(plan.bestWindow?.start).toBe('2026-11-18T14:00');
    expect(plan.generatedAt).toBe(new Date(NOW_MS).toISOString());
    expect(plan.impacts.map((impact) => impact.id)).toContain('commute-metro');
    expect(aqi.getForecast).toHaveBeenCalledWith({ latitude: 28.61, longitude: 77.21 });
    expect(geocoder.search).not.toHaveBeenCalled();
  });

  it('labels unnamed coordinates with the rounded numbers', async () => {
    const { service } = setup();
    const plan = await service.createPlan({
      ...PROFILE,
      location: { kind: 'coords', latitude: 19.07609, longitude: 72.877426 },
    });
    expect(plan.location.label).toBe('19.08, 72.88');
  });

  it('geocodes a city name and labels the plan with the match', async () => {
    const { service, geocoder } = setup();
    const plan = await service.createPlan({
      ...PROFILE,
      location: { kind: 'city', name: 'delhi' },
    });
    expect(geocoder.search).toHaveBeenCalledWith('delhi');
    expect(plan.location).toEqual({ label: 'Delhi, India', latitude: 28.65, longitude: 77.23 });
  });

  it('throws NotFoundError for a city that matches nothing', async () => {
    const { service, geocoder } = setup();
    geocoder.search.mockResolvedValueOnce([]);
    await expect(
      service.createPlan({ ...PROFILE, location: { kind: 'city', name: 'Atlantis' } }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('uses AI text when Gemini succeeds, but keeps titles and numbers deterministic', async () => {
    const ai = {
      generate: vi.fn<PlanGenerator['generate']>((ctx) =>
        Promise.resolve(aiContent(ctx.impacts.map((i) => i.id))),
      ),
    };
    const { service } = setup({ ai });
    const plan = await service.createPlan(PROFILE);
    expect(plan.source).toBe('ai');
    expect(plan.summary).toBe('AI summary.');
    const metro = plan.impacts.find((impact) => impact.id === 'commute-metro');
    expect(metro).toMatchObject({
      title: 'Take the metro on office days',
      explanation: 'AI explains commute-metro.',
      co2SavedKgPerWeek: 4.21,
    });
    const context = ai.generate.mock.calls[0]?.[0];
    expect(context?.profile).not.toHaveProperty('location');
    expect(context?.localTime).toBe('2026-11-18T06:30');
  });

  it('fills any explanation the AI left out from the deterministic copy', async () => {
    const ai = { generate: vi.fn<PlanGenerator['generate']>(() => Promise.resolve(aiContent([]))) };
    const plan = await setup({ ai }).service.createPlan(PROFILE);
    expect(plan.impacts.every((impact) => impact.explanation.endsWith('Estimate.'))).toBe(true);
  });

  it('falls back to the offline plan and logs a warning when Gemini fails', async () => {
    const ai = {
      generate: vi.fn<PlanGenerator['generate']>(() =>
        Promise.reject(new UpstreamError('timeout')),
      ),
    };
    const { service, logger } = setup({ ai });
    const plan = await service.createPlan({ ...PROFILE, language: 'hi' });
    expect(plan.source).toBe('fallback');
    expect(plan.impacts[0]?.title).toBe('दफ़्तर के दिनों में मेट्रो लें');
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledWith(
      { reason: 'other', errorClass: 'UpstreamError' },
      'AI plan failed; serving the offline plan',
    );
  });

  it('logs why the offline plan was served when AI is not configured', async () => {
    const { service, logger } = setup({});
    const plan = await service.createPlan(PROFILE);
    expect(plan.source).toBe('fallback');
    expect(logger.warn).toHaveBeenCalledWith(
      { reason: 'ai_not_configured' },
      'Serving the offline plan',
    );
  });

  it('serves a repeat request in the same hour from cache', async () => {
    const ai = { generate: vi.fn<PlanGenerator['generate']>(() => Promise.resolve(aiContent([]))) };
    const { service } = setup({ ai });
    const first = await service.createPlan(PROFILE);
    const second = await service.createPlan(PROFILE);
    expect(second).toBe(first);
    expect(ai.generate).toHaveBeenCalledOnce();
  });

  it('surfaces an empty forecast as an upstream error', async () => {
    const { service } = setup({ samples: [] });
    await expect(service.createPlan(PROFILE)).rejects.toThrow('No air quality data');
  });
});

describe('planCacheKey', () => {
  const place = { latitude: 28.6139, longitude: 77.209 };
  const key = (profile: UserProfile, time: string): string => planCacheKey(profile, place, time);

  it('is stable within an hour and for nearby points, and changes with the hour or the profile', () => {
    const base = key(PROFILE, '2026-11-18T06:05');
    expect(key(PROFILE, '2026-11-18T06:55')).toBe(base);
    expect(
      planCacheKey(PROFILE, { latitude: 28.6141, longitude: 77.2091 }, '2026-11-18T06:05'),
    ).toBe(base);
    expect(key(PROFILE, '2026-11-18T07:00')).not.toBe(base);
    expect(key({ ...PROFILE, language: 'hi' }, '2026-11-18T06:05')).not.toBe(base);
  });
});
