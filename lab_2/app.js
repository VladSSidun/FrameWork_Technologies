const http = require('http');
const config = require('#config/env');
const { log } = require('#utils/logger');
const { router } = require('#routes/index');

const server = http.createServer((req, res) => {
  // Логуємо кожен вхідний запит в development режимі
  if (config.NODE_ENV === 'development') {
    log('INFO', { method: req.method, url: req.url });
  }
  // Передаємо запит в роутер
  router(req, res);
});

// Graceful Shutdown — коректне завершення при отриманні сигналу
function gracefulShutdown(signal) {
  log('INFO', {
    message: `Отримано сигнал ${signal}. Починаємо завершення...`,
  });

  const forceExitTimer = setTimeout(() => {
    log('ERROR', {
      message: 'Примусове завершення: сервер не закрився за 10 секунд',
    });
    process.exit(2);
  }, 10000);
  forceExitTimer.unref();

  server.close((err) => {
    if (err) {
      log('ERROR', { message: `Помилка при закритті сервера: ${err.message}` });
      process.exit(1);
    }
    log('INFO', { message: 'Сервер успішно закрито. До побачення!' });
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  log('ERROR', {
    message: 'uncaughtException',
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  log('ERROR', {
    message: 'unhandledRejection',
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  gracefulShutdown('unhandledRejection');
});

module.exports = { server };
