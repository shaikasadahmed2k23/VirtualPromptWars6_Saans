import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const config = loadConfig(process.env);
const logger = createLogger(config.logLevel);
const app = createApp({ webDistDir: config.webDistDir });

app.listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port, env: config.nodeEnv }, 'server listening');
});
