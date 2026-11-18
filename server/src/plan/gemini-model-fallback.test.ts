import { describe, expect, it, vi } from 'vitest';

import type { Clock } from '../lib/clock.js';
import { UpstreamError } from '../lib/errors.js';
import { context } from '../test/fixtures.js';

import { GeminiPlanGenerator, type GenerateContentFn } from './gemini-plan-generator.js';

const OUTPUT = {
  summary: 'Very poor air today; go out 14:00–16:00.',
  routine: [{ start: '14:00', end: '16:00', title: 'Walk', advice: 'Best air of the day.' }],
  indoorHacks: [{ title: 'Close windows', detail: 'Until 09:00.' }],
  alternatives: [{ title: 'Metro', detail: 'Enclosed and low-carbon.' }],
  impactExplanations: [{ impactId: 'close-windows', explanation: 'Cuts 112 µg (40%).' }],
};

const MODELS = ['first-model', 'second-model'];

const failing = (): Promise<never> => Promise.reject(new Error('503 overloaded'));
const working = (): Promise<{ text: string }> => Promise.resolve({ text: JSON.stringify(OUTPUT) });

const build = (
  generateContent: GenerateContentFn,
  extra: { totalBudgetMs?: number; clock?: Clock; models?: readonly string[] } = {},
) => {
  const logger = { warn: vi.fn(), info: vi.fn() };
  const generator = new GeminiPlanGenerator({
    generateContent,
    models: extra.models ?? MODELS,
    logger,
    ...(extra.totalBudgetMs === undefined ? {} : { totalBudgetMs: extra.totalBudgetMs }),
    ...(extra.clock === undefined ? {} : { clock: extra.clock }),
  });
  return { generator, logger };
};

const modelsCalled = (generateContent: ReturnType<typeof vi.fn<GenerateContentFn>>): string[] =>
  generateContent.mock.calls.map(([request]) => request.model);

describe('GeminiPlanGenerator model list', () => {
  it('uses the first model when it works, and says which one served the plan', async () => {
    const generateContent = vi.fn<GenerateContentFn>(working);
    const { generator, logger } = build(generateContent);
    await generator.generate(context());
    expect(modelsCalled(generateContent)).toEqual(['first-model']);
    expect(logger.info).toHaveBeenCalledWith(
      { model: 'first-model', attempt: 1 },
      'Gemini plan generated',
    );
  });

  it('moves to the next model when one fails, and logs the one that served', async () => {
    const generateContent = vi.fn<GenerateContentFn>().mockImplementationOnce(failing);
    generateContent.mockImplementation(working);
    const { generator, logger } = build(generateContent);
    await expect(generator.generate(context())).resolves.toMatchObject({ summary: OUTPUT.summary });
    expect(modelsCalled(generateContent)).toEqual(['first-model', 'second-model']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'first-model' }),
      'Gemini attempt failed',
    );
    expect(logger.info).toHaveBeenCalledWith(
      { model: 'second-model', attempt: 2 },
      'Gemini plan generated',
    );
  });

  it('tries each model once, then gives up so the caller can fall back', async () => {
    const generateContent = vi.fn<GenerateContentFn>(failing);
    await expect(build(generateContent).generator.generate(context())).rejects.toBeInstanceOf(
      UpstreamError,
    );
    expect(modelsCalled(generateContent)).toEqual(MODELS);
  });

  it('retries a lone model once, since there is nothing else to fall back to', async () => {
    const generateContent = vi.fn<GenerateContentFn>(failing);
    await build(generateContent, { models: ['only-model'] })
      .generator.generate(context())
      .catch(() => undefined);
    expect(modelsCalled(generateContent)).toEqual(['only-model', 'only-model']);
  });

  it('stops trying models once the overall budget is spent', async () => {
    let now = 0;
    const clock: Clock = { now: () => now };
    const generateContent = vi.fn<GenerateContentFn>(() => {
      now += 600;
      return failing();
    });
    const { generator } = build(generateContent, { totalBudgetMs: 1000, clock });
    await generator.generate(context()).catch(() => undefined);
    expect(modelsCalled(generateContent)).toEqual(['first-model', 'second-model']);

    now = 0;
    generateContent.mockClear();
    const tight = build(generateContent, { totalBudgetMs: 500, clock });
    await tight.generator.generate(context()).catch(() => undefined);
    expect(modelsCalled(generateContent)).toEqual(['first-model']);
  });
});
