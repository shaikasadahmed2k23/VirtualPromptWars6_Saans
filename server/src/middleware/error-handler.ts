// `req.id` is typed by pino-http's augmentation of IncomingMessage (pino-http is mounted in app.ts).
import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { ApiError, ApiErrorCode } from '@saans/shared';

import { AppError, NotFoundError, PayloadTooLargeError, ValidationError } from '../lib/errors.js';
import { describeFailure } from '../lib/failure-detail.js';
import type { ErrorLogger } from '../lib/log.js';

const INTERNAL_STATUS = 500;
const NOT_FOUND_STATUS = 404;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const CLIENT_ERROR_MIN = 400;
const CLIENT_ERROR_MAX = 499;
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

interface ClientHttpError {
  readonly status: number;
}

// Express internals (body-parser, serve-static) raise `http-errors` carrying a 4xx `status`.
const isClientHttpError = (err: unknown): err is ClientHttpError =>
  typeof err === 'object' &&
  err !== null &&
  'status' in err &&
  typeof err.status === 'number' &&
  err.status >= CLIENT_ERROR_MIN &&
  err.status <= CLIENT_ERROR_MAX;

function fromClientHttpError(err: ClientHttpError): AppError {
  if (err.status === NOT_FOUND_STATUS) {
    return new NotFoundError('Not found', { cause: err });
  }
  if (err.status === PAYLOAD_TOO_LARGE_STATUS) {
    return new PayloadTooLargeError('Request body is too large', { cause: err });
  }
  return new ValidationError('Request could not be read', { cause: err });
}

function toAppError(err: unknown): AppError | undefined {
  if (err instanceof AppError) {
    return err;
  }
  return isClientHttpError(err) ? fromClientHttpError(err) : undefined;
}

const errorBody = (code: ApiErrorCode, message: string): ApiError => ({ error: { code, message } });

/**
 * Central error middleware. Known {@link AppError}s map to their status and code; anything
 * else becomes a generic 500 and is logged with the request id. Stack traces never reach clients.
 * @param logger - Where failures are logged.
 * @returns An Express error handler; mount it last.
 */
export function createErrorHandler(logger: ErrorLogger): ErrorRequestHandler {
  // eslint-disable-next-line max-params -- Express recognises error middleware only by its 4-argument signature.
  return (err: unknown, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const appError = toAppError(err);
    if (appError === undefined) {
      logger.error({ err, reqId: req.id }, 'unhandled error');
      res.status(INTERNAL_STATUS).json(errorBody('INTERNAL_ERROR', GENERIC_MESSAGE));
      return;
    }
    const cause = appError.cause === undefined ? undefined : describeFailure(appError.cause);
    logger.warn({ reqId: req.id, code: appError.code, cause }, appError.message);
    res.status(appError.status).json(errorBody(appError.code, appError.message));
  };
}

/**
 * Turns any request that reached the end of the `/api` router into a JSON 404.
 * @returns Middleware that forwards a {@link NotFoundError}.
 */
export function createApiNotFoundHandler(): RequestHandler {
  return (_req, _res, next) => {
    next(new NotFoundError('API route not found'));
  };
}
