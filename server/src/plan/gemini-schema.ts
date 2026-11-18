import { z } from 'zod';

import { INPUT_LIMITS, planContentSchema, type PlanContent } from '@saans/shared';

/**
 * What Gemini must return. Same as {@link planContentSchema}, except explanations arrive as
 * an array (JSON-schema output has no maps) and are converted to a keyed record afterwards.
 */
export const geminiPlanSchema = planContentSchema.omit({ impactExplanations: true }).extend({
  impactExplanations: z
    .array(
      z.strictObject({
        impactId: z.string().max(INPUT_LIMITS.idMax),
        explanation: planContentSchema.shape.summary,
      }),
    )
    .max(INPUT_LIMITS.impactItemsMax),
});

/** Parsed Gemini output. */
export type GeminiPlan = z.infer<typeof geminiPlanSchema>;

// The JSON-schema keywords Gemini's `responseJsonSchema` accepts (see @google/genai docs).
const SUPPORTED_KEYWORDS: ReadonlySet<string> = new Set([
  '$id',
  '$defs',
  '$ref',
  '$anchor',
  'type',
  'format',
  'title',
  'description',
  'enum',
  'items',
  'prefixItems',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
  'anyOf',
  'oneOf',
  'properties',
  'additionalProperties',
  'required',
]);

// Keywords whose value is a map of name → schema, not a schema itself.
const SCHEMA_MAPS: ReadonlySet<string> = new Set(['properties', '$defs']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mapValues = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, stripUnsupported(value)]));

/**
 * Removes JSON-schema keywords Gemini does not support (e.g. `maxLength`, `pattern`), keeping
 * property names intact. zod still enforces the full constraints on the parsed output.
 * @param node - A JSON-schema node.
 * @returns The node with only supported keywords.
 */
export function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripUnsupported);
  }
  if (!isRecord(node)) {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => SUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [
        key,
        SCHEMA_MAPS.has(key) && isRecord(value) ? mapValues(value) : stripUnsupported(value),
      ]),
  );
}

/** JSON schema sent as `responseJsonSchema`, derived from {@link geminiPlanSchema}. */
export const GEMINI_RESPONSE_SCHEMA = stripUnsupported(
  z.toJSONSchema(geminiPlanSchema, { io: 'output' }),
);

/**
 * Converts parsed Gemini output to {@link PlanContent}.
 * @param plan - Validated Gemini output.
 * @returns The same content with explanations keyed by impact id.
 */
export function toPlanContent(plan: GeminiPlan): PlanContent {
  const { impactExplanations, ...rest } = plan;
  return {
    ...rest,
    impactExplanations: Object.fromEntries(
      impactExplanations.map(({ impactId, explanation }) => [impactId, explanation]),
    ),
  };
}
