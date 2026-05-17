// app.js - фабрична функція buildApp().
// Відповідає за створення та конфігурацію екземпляру Fastify.
// НЕ запускає сервер - це робить server.js.
// Такий розподіл дозволяє тестувати застосунок без реального HTTP сервера.

// ── app.js ─────────────────────────────────────────────────
import { isMigrationNeeded } from '#migrations/migrate.js';
import githubRoutes from '#routes/github.route.js';
import healthRoutes from '#routes/health.route.js';
import ordersRoutes from '#routes/orders.route.js';
import productsRoutes from '#routes/products.route.js';
import productsRoutesV2 from '#routes/v2/products.route.js';
import { envSchema } from '#schemas/env.schema.js';
import { createBackup } from '#utils/backup.utils.js';
import { errorHandler } from '#utils/error-handler.js';
import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import helmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit'; // rateLimit
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger'; // swagger
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import path from 'path';

import streamRoutes from '#routes/stream.route.js';
import wsRoutes from '#routes/ws.route.js';
import fastifyWebsocket from '@fastify/websocket';

import '#db/models/product.model.js';
import mongoPlugin from '#db/mongo.js';
import { createProductsRepository } from '#repositories/products.repository.js';
import { createProductsService } from '#services/products.service.js';

export const buildApp = async () => {
  // eslint-disable-next-line no-process-env
  const isDev = process.env.NODE_ENV !== 'production';

  const fastify = Fastify({
    logger: {
      level: isDev ? 'info' : 'error',
      transport: isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // 1. Конфігурація середовища
  await fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });

  // підключаємо MongoDB
  await fastify.register(mongoPlugin);

  // DI — передаємо mongoose в репозиторій і сервіс
  const productsRepo = createProductsRepository();
  const productsService = createProductsService(productsRepo);
  fastify.decorate('productsService', productsService);

  // 2. Безпека
  await fastify.register(helmet, { global: true });
  await fastify.register(cors, {
    origin: isDev ? '*' : 'https://example.com',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  // 3. Rate limiting
  await fastify.register(rateLimit, {
    max: 100, // максимум 100 запитів...
    timeWindow: '1 minute', // ...за 1 хвилину з однієї IP
    // при перевищенні Fastify автоматично повертає 429
  });

  // 4. Swagger
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Inventory API',
        description: "REST API для управління складом комп'ютерної техніки",
        version: '1.0.0',
      },
      // описуємо обидві версії API
      tags: [
        { name: 'products', description: 'Управління продуктами' },
        { name: 'orders', description: 'Управління замовленнями' },
        { name: 'github', description: 'Аналітика GitHub репозиторіїв' },
        { name: 'health', description: 'Стан сервера' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs', // документація доступна за GET /docs
    uiConfig: {
      docExpansion: 'list', // розгортати секції списком
    },
  });

  // 5. Утиліти
  await fastify.register(sensible);
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });
  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  fastify.setErrorHandler(errorHandler);

  // 6. Маршрути - v1 і v2 під окремими префіксами
  await fastify.register(healthRoutes);
  await fastify.register(productsRoutes, { prefix: '/api/v1' });
  await fastify.register(ordersRoutes, { prefix: '/api/v1' });
  await fastify.register(productsRoutesV2, { prefix: '/api/v2' });
  await fastify.register(githubRoutes); // реєструє і v1 і v2 всередині

  await fastify.register(fastifyWebsocket);
  await fastify.register(streamRoutes, { prefix: '/api/v1' });
  await fastify.register(wsRoutes);

  await createBackup(fastify.log);

  if (await isMigrationNeeded()) {
    fastify.log.warn(
      'Data schema changed. Run "npm run migrate" to update existing files.'
    );
  }

  return fastify;
};
