import type { z } from 'zod';

import { ValidationError } from '../lib/errors.js';

/**
 * Parses untrusted request input, turning any failure into a 400.
 * @param schema - Expected shape.
 * @param input - `req.query`, `req.body`, …
 * @returns The validated value.
 * @throws {ValidationError} When the input does not match, naming the first bad field.
 */
export function parseRequest<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ValidationError.fromZod(result.error);
  }
  return result.data;
}
