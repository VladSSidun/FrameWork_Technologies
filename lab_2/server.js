const { server } = require('./app');
const config = require('#config/env');
const { log } = require('#utils/logger');

// server.listen() — прив'язує сервер до порту і починає слухати з'єднання
server.listen(config.PORT, config.HOSTNAME, () => {
  log('INFO', {
    message: 'Сервер запущено',
    host: config.HOSTNAME,
    port: config.PORT,
    env: config.NODE_ENV,
  });
});
