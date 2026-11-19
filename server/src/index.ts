import { createApp } from './app.js';
import { createServices } from './compose.js';
import { loadConfig } from './config.js';
import { createSystemClock } from './lib/clock.js';
import { SHUTDOWN_SIGNALS, createShutdownHandler } from './lib/shutdown.js';
import { createLogger } from './logger.js';

// Slow-loris guard: a client must send its headers, and its whole request, within these limits.
const HEADERS_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;

const config = loadConfig(process.env);
const logger = createLogger(config.logLevel);
const deps = createServices(config, { fetchFn: fetch, clock: createSystemClock(), logger });

const server = createApp(deps).listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port, env: config.nodeEnv }, 'server listening');
});
server.headersTimeout = HEADERS_TIMEOUT_MS;
server.requestTimeout = REQUEST_TIMEOUT_MS;

const shutdown = createShutdownHandler(server, {
  logger,
  exit: (code) => process.exit(code),
  setTimer: setTimeout,
});
for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, shutdown);
}
