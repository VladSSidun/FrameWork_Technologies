// app.js — фабрична функція buildApp().
// Відповідає за створення та конфігурацію екземпляру Fastify.
// НЕ запускає сервер — це робить server.js.
// Такий розподіл дозволяє тестувати застосунок без реального HTTP сервера.

import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';

import healthRoutes from '#routes/health.route.js';
import ordersRoutes from '#routes/orders.route.js';
import productsRoutes from '#routes/products.route.js';
import { envSchema } from '#schemas/env.schema.js';
import { errorHandler } from '#utils/error-handler.js';

export const buildApp = async () => {
  // Читаємо NODE_ENV до реєстрації @fastify/env
  // бо pino потрібен при створенні екземпляру
  // eslint-disable-next-line no-process-env
  const isDev = process.env.NODE_ENV !== 'production';

  // Створюємо екземпляр Fastify з вбудованим pino логером
  const fastify = Fastify({
    logger: {
      // В development — красивий форматований вивід через pino-pretty
      // В production — чистий JSON (для систем моніторингу: Datadog, ELK і т.д.)
      level: isDev ? 'info' : 'error',
      transport: isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ─── ПОРЯДОК РЕЄСТРАЦІЇ МАЄ ЗНАЧЕННЯ ──────────────────────────────────────
  // Кожен наступний плагін може використовувати тільки те,
  // що зареєстроване до нього.

  // 1. @fastify/env — ПЕРШИМ, бо fastify.config потрібен всім іншим
  // dotenv: true — автоматично завантажує .env файл
  await fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });

  // 2. @fastify/helmet — захисні HTTP заголовки для всіх відповідей
  // global: true — застосовується до всіх маршрутів
  await fastify.register(helmet, { global: true });

  // 3. @fastify/cors — дозволяє запити з браузера з іншого домену
  // В dev дозволяємо всі домени (*), в prod — тільки конкретний
  await fastify.register(cors, {
    origin: isDev ? '*' : 'https://example.com',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  // 4. @fastify/sensible — додає reply.notFound(), reply.badRequest() тощо
  // Має бути до маршрутів, щоб методи були доступні в handlers
  await fastify.register(sensible);

  // 5. setErrorHandler — реєструємо ДО маршрутів щоб перехоплювати їхні помилки
  fastify.setErrorHandler(errorHandler);

  // 6. Маршрути — ОСТАННІМИ, залежать від всіх попередніх плагінів
  await fastify.register(healthRoutes); // /health, /health/details
  await fastify.register(productsRoutes, { prefix: '/api' }); // /api/products
  await fastify.register(ordersRoutes, { prefix: '/api' }); // /api/orders

  return fastify;
};
