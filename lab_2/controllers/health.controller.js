// Controller для health ендпоінтів.
// Отримує request/reply від Fastify, делегує логіку до service (якщо є),
// формує відповідь.

// GET /health — публічний, просто перевірка чи сервер живий
export const getHealth = async (request, reply) => {
  return reply.send({ status: 'ok' });
};

// GET /health/details — закритий (захищений onRequest hook в route).
// Повертає детальну інформацію про процес Node.js.
export const getHealthDetails = async (request, reply) => {
  const mem = process.memoryUsage();

  return reply.send({
    status: 'ok',
    pid: process.pid, // ідентифікатор процесу
    nodeVersion: process.version, // версія Node.js
    platform: process.platform, // 'win32', 'linux' тощо
    uptime: Math.floor(process.uptime()), // час роботи сервера в секундах
    memoryUsage: {
      rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    },
  });
};
