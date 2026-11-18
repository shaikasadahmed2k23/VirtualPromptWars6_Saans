import { GoogleGenAI, ThinkingLevel } from '@google/genai';

import type { AppConfig } from '../config.js';
import type { WarnLogger } from '../lib/log.js';

import { GeminiPlanGenerator, type GenerateContentRequest } from './gemini-plan-generator.js';
import type { PlanGenerator } from './plan-generator.js';

const SDK_LEVELS = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
} as const;

// The SDK types the level as its own enum; translate our plain string at the boundary.
function toSdkRequest({ config, ...rest }: GenerateContentRequest) {
  const { thinkingConfig, ...others } = config;
  return {
    ...rest,
    config:
      thinkingConfig === undefined
        ? others
        : {
            ...others,
            thinkingConfig: { thinkingLevel: SDK_LEVELS[thinkingConfig.thinkingLevel] },
          },
  };
}

/**
 * Builds the Gemini plan generator from configuration, or null (with a warning) when the key
 * or model is missing, so the server still boots and serves offline plans.
 * @param config - Gemini key and model from the environment.
 * @param logger - Where to report a missing configuration.
 * @returns The generator, or null when AI is not configured.
 */
export function createAiGenerator(
  config: Pick<AppConfig, 'geminiApiKey' | 'geminiModel' | 'geminiThinkingLevel'>,
  logger: WarnLogger,
): PlanGenerator | null {
  const { geminiApiKey, geminiModel } = config;
  if (geminiApiKey === null || geminiModel === null) {
    logger.warn(
      { hasKey: geminiApiKey !== null, hasModel: geminiModel !== null },
      'GEMINI_API_KEY or GEMINI_MODEL is not set; serving offline plans only',
    );
    return null;
  }
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  return new GeminiPlanGenerator({
    model: geminiModel,
    logger,
    ...(config.geminiThinkingLevel === null ? {} : { thinkingLevel: config.geminiThinkingLevel }),
    generateContent: (request) => ai.models.generateContent(toSdkRequest(request)),
  });
}
