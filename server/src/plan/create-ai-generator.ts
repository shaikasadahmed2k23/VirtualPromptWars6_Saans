import { GoogleGenAI } from '@google/genai';

import type { AppConfig } from '../config.js';

import { GeminiPlanGenerator } from './gemini-plan-generator.js';
import type { PlanGenerator } from './plan-generator.js';

/** The one log method the factory needs. */
export interface StartupLogger {
  warn: (details: object, message: string) => void;
}

/**
 * Builds the Gemini plan generator from configuration, or null (with a warning) when the key
 * or model is missing, so the server still boots and serves offline plans.
 * @param config - Gemini key and model from the environment.
 * @param logger - Where to report a missing configuration.
 * @returns The generator, or null when AI is not configured.
 */
export function createAiGenerator(
  config: Pick<AppConfig, 'geminiApiKey' | 'geminiModel'>,
  logger: StartupLogger,
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
    generateContent: (request) => ai.models.generateContent(request),
  });
}
