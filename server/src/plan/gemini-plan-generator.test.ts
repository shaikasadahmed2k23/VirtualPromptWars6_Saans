import { describe, expect, it, vi } from 'vitest';

import { UpstreamError } from '../lib/errors.js';
import { context } from '../test/fixtures.js';

import type { AiFailure } from './ai-failure.js';
import { GeminiPlanGenerator, type GenerateContentFn } from './gemini-plan-generator.js';
import { GEMINI_RESPONSE_SCHEMA, stripUnsupported } from './gemini-schema.js';

// A lone model is tried twice: the first attempt and one retry.
const GEMINI_MAX_ATTEMPTS = 2;

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
    models: ['test-model'],
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

describe('GeminiPlanGenerator failure logging', () => {
  class FakeApiError extends Error {
    constructor(readonly status: number) {
      super('API key not valid. Please pass a valid API key.');
    }
  }

  interface AttemptFields {
    readonly attempt: number;
    readonly model: string;
  }

  const logged = async (
    generateContent: GenerateContentFn,
    timeoutMs?: number,
  ): Promise<(AiFailure & AttemptFields)[]> => {
    const warn = vi.fn<(details: object, message: string) => void>();
    const logging = new GeminiPlanGenerator({
      generateContent,
      models: ['test-model'],
      logger: { warn, info: vi.fn() },
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    });
    await logging.generate(context()).catch(() => undefined);
    return warn.mock.calls.map(([details]) => details as AiFailure & AttemptFields);
  };

  it.each([
    {
      label: 'an HTTP rejection',
      call: () => Promise.reject(new FakeApiError(400)),
      reason: 'http_error',
      status: 400,
    },
    {
      label: 'invalid JSON',
      call: () => Promise.resolve({ text: 'nope' }),
      reason: 'bad_json',
      status: undefined,
    },
    {
      label: 'a schema violation',
      call: () =>
        Promise.resolve({ text: JSON.stringify({ ...validOutput, routine: [{ start: '7' }] }) }),
      reason: 'schema',
      status: undefined,
    },
    {
      label: 'an unknown impact id',
      call: () =>
        Promise.resolve({
          text: JSON.stringify({
            ...validOutput,
            impactExplanations: [{ impactId: 'nope', explanation: 'x' }],
          }),
        }),
      reason: 'unknown_impact',
      status: undefined,
    },
  ])('logs the reason for $label on every attempt', async ({ call, reason, status }) => {
    const entries = await logged(vi.fn<GenerateContentFn>(call));
    expect(entries.map((entry) => entry.reason)).toEqual([reason, reason]);
    expect(entries.map((entry) => entry.attempt)).toEqual([1, 2]);
    expect(entries[0]?.status).toBe(status);
    expect(entries[0]?.model).toBe('test-model');
  });

  it('logs a timeout as such', async () => {
    const entries = await logged(() => new Promise(() => undefined), 10);
    expect(entries.map((entry) => entry.reason)).toEqual(['timeout', 'timeout']);
  });

  it('never logs the prompt, the model output or the error message', async () => {
    const entries = await logged(() => Promise.reject(new FakeApiError(403)));
    const text = JSON.stringify(entries);
    expect(text).not.toContain('<HOUSEHOLD>');
    expect(text).not.toContain('API key not valid');
  });

  it('classifies an error with no status as other', async () => {
    const entries = await logged(() => Promise.reject(new Error('socket hang up')));
    expect(entries[0]).toMatchObject({ reason: 'other', errorClass: 'Error' });
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
