import type { IncomingMessage } from 'node:http';

import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const HEALTH_PATH = '/api/health';

const pathOnly = (url: string | undefined): string => (url ?? '').split('?')[0] ?? '';

/**
 * Request logging that keeps personal data out of the logs: one line per request with the id,
 * method, path (no query string, which holds coordinates and city names) and status. Headers,
 * client IPs and cookies are never logged, and health-check pings are not logged at all.
 * @param logger - Root logger.
 * @param genReqId - Produces a request id.
 * @returns The pino-http middleware.
 */
export function createRequestLogger(logger: Logger, genReqId: () => string): RequestHandler {
  return pinoHttp({
    logger,
    genReqId,
    autoLogging: { ignore: (req) => pathOnly(req.url) === HEALTH_PATH },
    serializers: {
      req: (req: IncomingMessage) => ({
        id: req.id,
        method: req.method,
        url: pathOnly(req.url),
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
