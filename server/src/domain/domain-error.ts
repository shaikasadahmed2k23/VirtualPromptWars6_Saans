/** Reasons a pure domain calculation can reject its input. */
export type DomainErrorCode = 'INVALID_INPUT';

/** Raised by domain functions when given input they cannot compute with (negative, NaN, …). */
export class DomainError extends Error {
  override readonly name = 'DomainError';

  /**
   * @param code - Machine-readable reason.
   * @param message - Human-readable description naming the offending value.
   */
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Guards a numeric input that must be finite and not negative.
 * @param label - Name of the input, used in the error message.
 * @param value - The value to check.
 * @throws {DomainError} When `value` is negative, NaN or infinite.
 */
export function assertNonNegativeFinite(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainError(
      'INVALID_INPUT',
      `${label} must be a non-negative finite number, got ${String(value)}`,
    );
  }
}
