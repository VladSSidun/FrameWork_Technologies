// Централізований обробник помилок для Fastify.
// Виконується коли будь-який handler, hook або плагін кидає помилку.
// Без setErrorHandler — Fastify має дефолтний handler, але він менш гнучкий.

export const errorHandler = (error, request, reply) => {
  // Логуємо помилку через pino (вбудований логер Fastify)
  // request.log прив'язаний до конкретного запиту (містить request.id)
  request.log.error(
    { err: error, method: request.method, url: request.url },
    'Request error'
  );

  // error.statusCode встановлюється @fastify/sensible (reply.notFound() → 404)
  // Якщо statusCode немає — повертаємо 500
  const statusCode = error.statusCode ?? 500;

  return reply.status(statusCode).send({
    statusCode,
    error: error.name,
    message: error.message,
  });
};
