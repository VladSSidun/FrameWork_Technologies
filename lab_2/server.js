// server.js — точка входу в застосунок.
// Відповідає ТІЛЬКИ за запуск HTTP сервера.
// buildApp() — окремо, щоб можна було тестувати без запуску сервера.

import { buildApp } from './app.js';

// Graceful Shutdown — коректне завершення роботи сервера.
// Даємо серверу час завершити поточні запити перед зупинкою.
const gracefulShutdown = async (fastify, signal) => {
  fastify.log.info(`Sinal recieved: ${signal}. Stoping server...`);

  // Якщо за 10 секунд сервер не зупинився — примусово виходимо
  const timeout = setTimeout(() => {
    fastify.log.error('Timeout graceful shutdown — exit');
    process.exit(1);
  }, 10_000).unref(); // .unref() — не блокує Node.js event loop

  try {
    // fastify.close() чекає завершення всіх запитів
    // і викликає хук onClose (зареєстрований в app.js)
    await fastify.close();
    clearTimeout(timeout);
    process.exit(0);
  } catch (err) {
    fastify.log.error(err, 'Error while stopping server');
    process.exit(1);
  }
};

const start = async () => {
  // Будуємо застосунок (всі плагіни та маршрути)
  const fastify = await buildApp();

  // Реєструємо хук onClose — виконується при fastify.close()
  // Зручне місце для закриття БД, черг повідомлень тощо
  fastify.addHook('onClose', async () => {
    fastify.log.info('Server is closed, resources is freed');
  });

  // Обробка сигналів операційної системи
  // SIGINT — Ctrl+C в терміналі
  // SIGTERM — від Docker, Kubernetes, системних менеджерів процесів
  process.on('SIGINT', () => gracefulShutdown(fastify, 'SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown(fastify, 'SIGTERM'));

  // ─── ВІДМІННІСТЬ ВІД setErrorHandler ──────────────────────────────────────
  // setErrorHandler — перехоплює помилки ВСЕРЕДИНІ HTTP запитів (в handlers, hooks)
  // uncaughtException — синхронні помилки ЗА МЕЖАМИ запитів (таймери, ініціалізація)
  // unhandledRejection — відхилені Promise ЗА МЕЖАМИ запитів
  process.on('uncaughtException', (err) => {
    fastify.log.fatal(err, 'Error: (uncaughtException)');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    fastify.log.fatal({ reason }, 'Error: rejection (unhandledRejection)');
    process.exit(1);
  });

  // Запускаємо сервер — fastify.config доступний після buildApp()
  await fastify.listen({
    port: fastify.config.PORT,
    host: fastify.config.HOST,
  });
};

start();
// setTimeout(() => {
//   throw new Error('Тестова синхронна помилка поза межами запиту');
// }, 3000);
// setTimeout(() => {
//   Promise.reject(new Error('Тестовий rejected Promise без .catch()'));
// }, 3000);
