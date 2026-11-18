import { describe, expect, it, vi } from 'vitest';

import { context } from '../test/fixtures.js';

import { createAiGenerator } from './create-ai-generator.js';
import { GeminiPlanGenerator } from './gemini-plan-generator.js';

const sdk = vi.hoisted(() => ({
  apiKeys: [] as string[],
  generateContent: vi.fn(),
}));

// The real SDK is replaced: tests never reach Google.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = { generateContent: sdk.generateContent };
    constructor({ apiKey }: { apiKey: string }) {
      sdk.apiKeys.push(apiKey);
    }
  },
}));

const validOutput = {
  summary: 'Plan.',
  routine: [],
  indoorHacks: [],
  alternatives: [],
  impactExplanations: [],
};

describe('createAiGenerator', () => {
  it.each([
    ['no key', { geminiApiKey: null, geminiModel: 'a-model' }],
    ['no model', { geminiApiKey: 'k', geminiModel: null }],
  ])('returns null and warns when there is %s', (_label, config) => {
    const logger = { warn: vi.fn() };
    expect(createAiGenerator(config, logger)).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ hasKey: config.geminiApiKey !== null }),
      expect.stringContaining('offline plans only'),
    );
  });

  it('wires the configured key and model into the Gemini SDK', async () => {
    sdk.generateContent.mockResolvedValue({ text: JSON.stringify(validOutput) });
    const logger = { warn: vi.fn() };
    const generator = createAiGenerator(
      { geminiApiKey: 'test-key', geminiModel: 'a-model' },
      logger,
    );
    expect(generator).toBeInstanceOf(GeminiPlanGenerator);
    await expect(generator?.generate(context({ impacts: [] }))).resolves.toMatchObject({
      summary: 'Plan.',
    });
    expect(sdk.apiKeys).toEqual(['test-key']);
    expect(sdk.generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'a-model' }));
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
