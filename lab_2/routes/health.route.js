// Маршрути для /health і /health/details.
// Реєструємо через export default async function — так Fastify підхоплює через register().

import { getHealth, getHealthDetails } from '#controllers/health.controller.js';

export default async function healthRoutes(fastify) {
  // GET /health — публічний, без авторизації
  fastify.get(
    '/health',
    {
      schema: {
        // response schema — описує що повертаємо (для fast-json-stringify)
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    getHealth
  );

  // GET /health/details — закритий, перевіряємо ADMIN_API_KEY
  fastify.get(
    '/health/details',
    {
      // Локальний хук — виконується ТІЛЬКИ для цього маршруту
      // Глобальний onRequest (якби був) виконується для ВСІХ маршрутів
      onRequest: async (request, reply) => {
        const apiKey = request.headers['x-api-key'];

        // fastify.config доступний бо @fastify/env зареєстрований з fastify-plugin
        // і передав декоратор у батьківський контекст
        if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
          throw reply.unauthorized('Невірний або відсутній x-api-key');
        }
      },
    },
    getHealthDetails
  );
}
