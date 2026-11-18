import type { ZodError } from 'zod';

import type { ApiErrorCode } from '@saans/shared';

/**
 * Base class for errors whose message is safe to show to API clients.
 * Anything that is not an AppError is reported as a generic 500.
 */
export abstract class AppError extends Error {
  /** HTTP status to respond with. */
  abstract readonly status: number;
  /** Machine-readable code placed in the error body. */
  abstract readonly code: ApiErrorCode;

  /**
   * @param message - Client-safe description.
   * @param options - Optional underlying cause, kept for logs only.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The request is malformed or fails validation (400). */
export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';

  /**
   * Builds a ValidationError from the first zod issue, prefixed with its field path.
   * @param error - The zod failure.
   * @returns An error whose message reads like `household.adults: adults must be at least 1`.
   */
  static fromZod(error: ZodError): ValidationError {
    const issue = error.issues[0];
    const path = issue?.path.join('.') ?? '';
    const message = issue?.message ?? 'Invalid request';
    return new ValidationError(path === '' ? message : `${path}: ${message}`, { cause: error });
  }
}

/** The requested resource does not exist (404). */
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
}

/** The request body exceeds the size limit (413). */
export class PayloadTooLargeError extends AppError {
  readonly status = 413;
  readonly code = 'PAYLOAD_TOO_LARGE';
}

/** The client is sending requests too quickly (429). */
export class RateLimitError extends AppError {
  readonly status = 429;
  readonly code = 'RATE_LIMITED';
}

/** A third-party service failed, timed out or returned something unusable (502). */
export class UpstreamError extends AppError {
  readonly status = 502;
  readonly code: ApiErrorCode = 'UPSTREAM_ERROR';
}

/** The city-search service failed, so the user can still type coordinates or retry (502). */
export class GeocodingUnavailableError extends UpstreamError {
  override readonly code = 'GEOCODING_UNAVAILABLE';
}
