import { describe, expect, it, vi } from 'vitest';

import { UpstreamError } from '../lib/errors.js';
import { context } from '../test/fixtures.js';

import {
  GEMINI_MAX_ATTEMPTS,
  GeminiPlanGenerator,
  type GenerateContentFn,
} from './gemini-plan-generator.js';
import { GEMINI_RESPONSE_SCHEMA, stripUnsupported } from './gemini-schema.js';

const validOutput = {
  summary: 'Very poor air today; go out 14:00–16:00.',
  routine: [{ start: '14:00', end: '16:00', title: 'Walk', advice: 'Best air of the day.' }],
  indoorHacks: [{ title: 'Close windows', detail: 'Until 09:00.' }],
  alternatives: [{ title: 'Metro', detail: 'Enclosed and low-carbon.' }],
  impactExplanations: [{ impactId: 'close-windows', explanation: 'Cuts 112 µg (40%).' }],
};

const respond = (text: string | undefined) =>
  vi.fn<GenerateContentFn>(() => Promise.resolve({ text }));

const generator = (generateContent: GenerateContentFn, timeoutMs?: number): GeminiPlanGenerator =>
  new GeminiPlanGenerator({
    generateContent,
    model: 'test-model',
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });

describe('GeminiPlanGenerator', () => {
  it('returns validated content with explanations keyed by impact id', async () => {
    const content = await generator(respond(JSON.stringify(validOutput))).generate(context());
    expect(content.impactExplanations).toEqual({ 'close-windows': 'Cuts 112 µg (40%).' });
    expect(content.summary).toBe(validOutput.summary);
  });

  it('sends the configured model, a JSON schema, low temperature and an abort signal', async () => {
    const generateContent = respond(JSON.stringify(validOutput));
    await generator(generateContent).generate(context());
    const request = generateContent.mock.calls[0]?.[0];
    expect(request?.model).toBe('test-model');
    expect(request?.config.responseMimeType).toBe('application/json');
    expect(request?.config.responseJsonSchema).toBe(GEMINI_RESPONSE_SCHEMA);
    expect(request?.config.temperature).toBeLessThanOrEqual(0.3);
    expect(request?.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(request?.contents).toContain('<HOUSEHOLD>');
  });

  it.each([
    ['invalid JSON', respond('Sure! Here is your plan:')],
    ['an empty response', respond(undefined)],
    [
      'output that breaks the schema',
      respond(JSON.stringify({ ...validOutput, routine: [{ start: '7am' }] })),
    ],
    [
      'an unknown impact id',
      respond(
        JSON.stringify({
          ...validOutput,
          impactExplanations: [{ impactId: 'buy-a-tesla', explanation: 'x' }],
        }),
      ),
    ],
  ])('retries once, then throws UpstreamError on %s', async (_label, generateContent) => {
    await expect(generator(generateContent).generate(context())).rejects.toBeInstanceOf(
      UpstreamError,
    );
    expect(generateContent).toHaveBeenCalledTimes(GEMINI_MAX_ATTEMPTS);
  });

  it('times out a hanging call, aborting it, and retries', async () => {
    const signals: AbortSignal[] = [];
    const hanging = vi.fn<GenerateContentFn>(({ config }) => {
      signals.push(config.abortSignal);
      return new Promise(() => undefined);
    });
    await expect(generator(hanging, 10).generate(context())).rejects.toThrow(
      'AI plan generation failed',
    );
    expect(hanging).toHaveBeenCalledTimes(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('succeeds on the retry after a transient failure', async () => {
    const flaky = vi
      .fn<GenerateContentFn>()
      .mockRejectedValueOnce(new Error('503 overloaded'))
      .mockResolvedValueOnce({ text: JSON.stringify(validOutput) });
    await expect(generator(flaky).generate(context())).resolves.toMatchObject({
      summary: validOutput.summary,
    });
  });
});

describe('Gemini response schema', () => {
  it('keeps only keywords Gemini supports, without touching property names', () => {
    const schema = JSON.stringify(GEMINI_RESPONSE_SCHEMA);
    expect(schema).not.toMatch(/"maxLength"|"minLength"|"pattern"|"\$schema"/);
    expect(schema).toContain('"impactExplanations"');
    expect(
      stripUnsupported({
        type: 'object',
        properties: { pattern: { type: 'string', pattern: 'x' } },
      }),
    ).toEqual({
      type: 'object',
      properties: { pattern: { type: 'string' } },
    });
  });
});
