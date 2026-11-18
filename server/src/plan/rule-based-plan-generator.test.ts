import { describe, expect, it } from 'vitest';

import { LANGUAGES, NAQI_CATEGORIES, planContentSchema } from '@saans/shared';

import { BEST, CURRENT_AQI, PROFILE, WORST, context, window } from '../test/fixtures.js';

import { IMPACT_IDS, type KnownImpactFacts } from './plan-generator.js';
import { toPromptProfile } from './prompt.js';
import {
  buildFallbackContent,
  dayTier,
  RuleBasedPlanGenerator,
} from './rule-based-plan-generator.js';

const everyImpact: KnownImpactFacts[] = IMPACT_IDS.map((id) => ({
  id,
  category: 'indoor',
  exposureAvoided: { micrograms: 105, percent: 70 },
  restHoursEquivalent: 2.1,
  co2SavedKgPerWeek: id === 'commute-metro' ? 9.79 : null,
}));

describe('RuleBasedPlanGenerator', () => {
  describe.each(LANGUAGES)('in %s', (language) => {
    it.each(NAQI_CATEGORIES)('produces schema-valid content for a %s day', async (category) => {
      const ctx = context({
        language,
        currentAqi: { ...CURRENT_AQI, category },
        worstWindow: { ...WORST, category },
        impacts: everyImpact,
      });
      const content = await new RuleBasedPlanGenerator().generate(ctx);
      expect(planContentSchema.parse(content)).toEqual(content);
      expect(Object.keys(content.impactExplanations)).toEqual([...IMPACT_IDS]);
      expect(content.indoorHacks.length).toBeGreaterThan(0);
    });

    it('explains every impact with its exact numbers', () => {
      const { impactExplanations } = buildFallbackContent(
        context({ language, impacts: everyImpact }),
      );
      for (const explanation of Object.values(impactExplanations)) {
        expect(explanation).toContain('105');
        expect(explanation).toContain('70%');
      }
      expect(impactExplanations['commute-metro']).toContain('9.79');
    });

    it('reads a missing figure as 0 rather than failing', () => {
      const blank = {
        ...everyImpact[0],
        exposureAvoided: null,
        restHoursEquivalent: null,
        co2SavedKgPerWeek: null,
      } as const;
      const { impactExplanations } = buildFallbackContent(
        context({ language, impacts: [{ ...blank, id: 'commute-metro', category: 'commute' }] }),
      );
      expect(impactExplanations['commute-metro']).toMatch(/0 µg \(0%\)/);
    });

    it('summarises a day with no outdoor window and a day where even the best is unsafe', () => {
      const none = buildFallbackContent(context({ language, bestWindow: null, worstWindow: null }));
      expect(none.routine).toHaveLength(1);
      const unsafe = buildFallbackContent(
        context({ language, bestWindow: window({ allUnsafe: true }) }),
      );
      expect(unsafe.summary).toContain('14:00–16:00');
    });
  });

  it('builds a block per window plus the night block; PlanService orders them from now', () => {
    const { routine } = buildFallbackContent(context());
    expect(routine.map((block) => [block.start, block.end])).toEqual([
      ['14:00', '16:00'],
      ['07:00', '09:00'],
      ['22:00', '06:00'],
    ]);
  });

  it.each([
    {
      co2: null,
      ug: 105,
      en: /^Switching from car to the metro cuts the PM2\.5/,
      hi: /मेट्रो लेने से आने-जाने/,
    },
    {
      co2: 4.21,
      ug: 0,
      en: /^Switching from car to the metro saves about 4\.21 kg of CO2 a week\. Estimate\.$/,
      hi: /मेट्रो लेने से हर हफ़्ते लगभग 4\.21 किलो CO2 बचती है। अनुमान।$/,
    },
  ])(
    'words the metro switch around the benefits it really has (co2 $co2, ug $ug)',
    ({ co2, ug, en, hi }) => {
      const impact: KnownImpactFacts = {
        id: 'commute-metro',
        category: 'commute',
        exposureAvoided: { micrograms: ug, percent: ug === 0 ? 0 : 70 },
        restHoursEquivalent: null,
        co2SavedKgPerWeek: co2,
      };
      const text = (language: 'en' | 'hi'): string | undefined =>
        buildFallbackContent(context({ language, impacts: [impact] })).impactExplanations[
          'commute-metro'
        ];
      expect(text('en')).toMatch(en);
      expect(text('hi')).toMatch(hi);
      expect(text('en')).not.toMatch(/ 0 kg| 0 µg/);
    },
  );

  it('shows one block when the best and worst window coincide', () => {
    const { routine } = buildFallbackContent(context({ worstWindow: BEST }));
    expect(routine.map((block) => block.start)).toEqual(['14:00', '22:00']);
  });

  it('tailors alternatives to commute and cooking fuel', () => {
    const carLpg = buildFallbackContent(context()).alternatives.map((tip) => tip.title);
    expect(carLpg[0]).toBe('Take the metro or share a ride');
    expect(carLpg).toContain('Cook with a lid on');
    const homeBiomass = buildFallbackContent(
      context({
        profile: toPromptProfile({
          ...PROFILE,
          cookingFuel: 'biomass',
          work: { ...PROFILE.work, location: 'home' },
        }),
      }),
    ).alternatives.map((tip) => tip.title);
    expect(homeBiomass).not.toContain('Take the metro or share a ride');
    expect(homeBiomass[0]).toBe('Switch to LPG or induction');
  });

  it.each([
    ['good', 'good', 'clean'],
    ['good', 'veryPoor', 'severe'],
    ['poor', 'satisfactory', 'polluted'],
  ] as const)('uses the worse of now (%s) and the peak (%s): %s', (now, peak, tier) => {
    expect(
      dayTier(
        context({
          currentAqi: { ...CURRENT_AQI, category: now },
          worstWindow: { ...WORST, category: peak },
        }),
      ),
    ).toBe(tier);
    expect(
      dayTier(context({ currentAqi: { ...CURRENT_AQI, category: now }, worstWindow: null })),
    ).toBe(
      dayTier(
        context({
          currentAqi: { ...CURRENT_AQI, category: now },
          worstWindow: { ...WORST, category: now },
        }),
      ),
    );
  });
});
