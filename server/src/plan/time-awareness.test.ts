import { describe, expect, it, vi } from 'vitest';

import type { Language, PlanResponse } from '@saans/shared';

import { buildAirSnapshot } from '../domain/air-snapshot.js';
import { TtlCache } from '../lib/ttl-cache.js';
import type { AqiProvider } from '../providers/aqi-provider.js';
import { AirService } from '../services/air-service.js';
import {
  PLAN_CACHE_MAX_ENTRIES,
  PLAN_CACHE_TTL_MS,
  PlanService,
} from '../services/plan-service.js';
import { FORECAST_SAMPLES, PROFILE, context, window } from '../test/fixtures.js';

import { buildFallbackContent, RuleBasedPlanGenerator } from './rule-based-plan-generator.js';

interface Case {
  readonly language: Language;
  readonly now: string;
  readonly best: string;
}

const summaryFor = ({ language, now, best }: Case): string => {
  const start = best.slice(0, 13);
  const bestWindow = window({
    start: best,
    end: `${start.slice(0, 11)}${String(Number(start.slice(11)) + 2)}:00`,
  });
  return buildFallbackContent(context({ language, localTime: now, bestWindow })).summary;
};

describe('fallback plan wording knows which day a window is on', () => {
  it.each([
    { language: 'en', now: '2026-11-18T08:00', best: '2026-11-18T14:00', say: 'today 14:00–16:00' },
    {
      language: 'en',
      now: '2026-11-18T16:14',
      best: '2026-11-19T14:00',
      say: 'tomorrow 14:00–16:00',
    },
    {
      language: 'en',
      now: '2026-11-18T23:30',
      best: '2026-11-19T14:00',
      say: 'tomorrow 14:00–16:00',
    },
    { language: 'hi', now: '2026-11-18T16:14', best: '2026-11-19T14:00', say: 'कल 14:00–16:00' },
    { language: 'hi', now: '2026-11-18T08:00', best: '2026-11-18T14:00', say: 'आज 14:00–16:00' },
  ] as const)('$language at $now: best window $best reads "$say"', ({ say, ...input }) => {
    expect(summaryFor(input)).toContain(say);
  });

  it.each([
    { language: 'en', say: 'Now is a good time to be outside.' },
    { language: 'hi', say: 'अभी बाहर निकलने का अच्छा समय है।' },
  ] as const)('says "now" in $language when the best window is under way', ({ language, say }) => {
    const summary = summaryFor({ language, now: '2026-11-18T16:14', best: '2026-11-18T16:00' });
    expect(summary).toContain(say);
    expect(summary).not.toContain('16:00–18:00');
  });

  it('labels the windows inside an exercise impact', () => {
    const exercise = {
      id: 'exercise-shift',
      category: 'routine',
      exposureAvoided: { micrograms: 50, percent: 40 },
      restHoursEquivalent: 1,
      co2SavedKgPerWeek: null,
    } as const;
    const { impactExplanations } = buildFallbackContent(
      context({
        localTime: '2026-11-18T16:14',
        bestWindow: window({ start: '2026-11-19T14:00', end: '2026-11-19T16:00' }),
        worstWindow: window({ start: '2026-11-18T18:00', end: '2026-11-18T20:00' }),
        impacts: [exercise],
      }),
    );
    expect(impactExplanations['exercise-shift']).toContain(
      'tomorrow 14:00–16:00 instead of today 18:00–20:00',
    );
  });
});

const planAt = async (instantUtc: string, utcOffsetSeconds: number): Promise<PlanResponse> => {
  const aqi: AqiProvider = {
    getForecast: vi.fn(() =>
      Promise.resolve({ timezone: 'Asia/Kolkata', utcOffsetSeconds, samples: FORECAST_SAMPLES }),
    ),
  };
  const clock = { now: () => Date.parse(instantUtc) };
  const service = new PlanService({
    air: new AirService(aqi, clock),
    geocoder: { search: () => Promise.resolve([]) },
    aiGenerator: null,
    fallbackGenerator: new RuleBasedPlanGenerator(),
    cache: new TtlCache<string, PlanResponse>({
      ttlMs: PLAN_CACHE_TTL_MS,
      maxEntries: PLAN_CACHE_MAX_ENTRIES,
      clock,
    }),
    clock,
    logger: { warn: vi.fn() },
  });
  const location = { kind: 'coords', latitude: 28.6, longitude: 77.2 } as const;
  return service.createPlan({ ...PROFILE, location });
};

describe('PlanService time awareness (the server runs in UTC)', () => {
  // 10:44 UTC is 16:14 in Delhi.
  const INSTANT = '2026-11-18T10:44:00Z';
  const IST = 19_800;

  it('at 16:14 IST the best window is tomorrow, labelled so, and blocks run in order from now', async () => {
    const plan = await planAt(INSTANT, IST);
    expect(plan.bestWindow?.start).toBe('2026-11-19T14:00');
    expect(plan.summary).toContain('tomorrow 14:00–16:00');
    const days = plan.routine.map((block) => block.day);
    expect(days).toEqual([...days].sort((a, b) => (a === b ? 0 : a === 'today' ? -1 : 1)));
    expect(plan.routine.at(-1)).toMatchObject({ day: 'tomorrow', start: '14:00' });
  });

  it('read with the server’s own UTC clock the same instant would wrongly be mid-morning', async () => {
    const plan = await planAt(INSTANT, 0);
    expect(plan.bestWindow?.start).toBe('2026-11-18T14:00');
    expect(plan.summary).toContain('today 14:00–16:00');
  });
});

describe('the current hour is a valid window start', () => {
  const samples = FORECAST_SAMPLES.map((sample) =>
    sample.time === '2026-11-18T16:00' || sample.time === '2026-11-18T17:00'
      ? { ...sample, pm25: 20 }
      : sample,
  );

  it.each(['2026-11-18T16:00', '2026-11-18T16:14', '2026-11-18T16:59'])('at %s', (now) => {
    const snapshot = buildAirSnapshot(samples, now);
    expect(snapshot?.bestWindow).toMatchObject({
      start: '2026-11-18T16:00',
      end: '2026-11-18T18:00',
    });
  });
});
