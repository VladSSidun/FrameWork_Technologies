import config from '#config/env.js';
import { log } from '#utils/logger.js';
import { server } from './app.js';

server.listen(config.PORT, config.HOSTNAME, () => {
  log('INFO', {
    message: 'Сервер запущено',
    host: config.HOSTNAME,
    port: config.PORT,
    env: config.NODE_ENV,
  });
});
