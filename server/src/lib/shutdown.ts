import type { ErrorLogger, InfoLogger } from './log.js';

/** How long in-flight requests get to finish after a stop signal before the process is forced out. */
export const SHUTDOWN_GRACE_MS = 10_000;

/** Signals a container platform sends to stop the process. */
export const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

/** The slice of `http.Server` needed to stop accepting connections. */
export interface ClosableServer {
  close: (callback: (error?: Error) => void) => unknown;
}

/** Process hooks, injected so the handler can be tested without exiting the test runner. */
export interface ShutdownRuntime {
  readonly logger: InfoLogger & ErrorLogger;
  readonly exit: (code: number) => void;
  /** Schedules the forced exit; the returned handle must not keep the process alive. */
  readonly setTimer: (callback: () => void, ms: number) => { unref: () => unknown };
}

/**
 * Builds the stop-signal handler: closes the server so in-flight requests finish, then exits
 * with 0 (or 1 if closing failed). If closing takes longer than {@link SHUTDOWN_GRACE_MS} the
 * process exits with 1 anyway.
 * @param server - The listening HTTP server.
 * @param runtime - Logger, exit and timer hooks.
 * @returns A handler to register for each of {@link SHUTDOWN_SIGNALS}.
 */
export function createShutdownHandler(
  server: ClosableServer,
  runtime: ShutdownRuntime,
): (signal: string) => void {
  const { logger, exit, setTimer } = runtime;
  return (signal) => {
    logger.info({ signal }, 'shutting down');
    setTimer(() => {
      logger.error({ graceMs: SHUTDOWN_GRACE_MS }, 'forced exit after shutdown timeout');
      exit(1);
    }, SHUTDOWN_GRACE_MS).unref();
    server.close((error) => {
      if (error !== undefined) {
        logger.error({ err: error }, 'server close failed');
        exit(1);
        return;
      }
      exit(0);
    });
  };
}
