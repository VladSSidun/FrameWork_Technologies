// ── app.js ─────────────────────────────────────────────────
import drizzlePlugin from '#db/drizzle.js';
import mysqlPlugin from '#db/mysql.js';
import redisPlugin from '#db/redis.js';
import { isMigrationNeeded } from '#migrations/migrate.js';
import { createProductsRepository } from '#repositories/products.repository.js';
import { createUsersRepository } from '#repositories/users.repository.js';
import authRoutes from '#routes/auth.route.js';
import githubRoutes from '#routes/github.route.js';
import healthRoutes from '#routes/health.route.js';
import ordersRoutes from '#routes/orders.route.js';
import productsRoutes from '#routes/products.route.js';
import streamRoutes from '#routes/stream.route.js';
import productsRoutesV2 from '#routes/v2/products.route.js';
import wsRoutes from '#routes/ws.route.js';
import { envSchema } from '#schemas/env.schema.js';
import { createAuthService } from '#services/auth.service.js';
import { createProductsService } from '#services/products.service.js';
import { createBackup } from '#utils/backup.utils.js';
import { createCacheUtils } from '#utils/cache.utils.js';
import { errorHandler } from '#utils/error-handler.js';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import helmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';
import RedisStore from 'fastify-session-redis-store';
import path from 'path';

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

  await fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });

  // Redis ДО rate-limit і session
  await fastify.register(redisPlugin);
  await fastify.register(mysqlPlugin);
  await fastify.register(drizzlePlugin);

  // DI — products
  const productsRepo = createProductsRepository(fastify.drizzle);
  const productsService = createProductsService(productsRepo, fastify.redis);
  fastify.decorate('productsService', productsService);

  // DI — users та auth
  const usersRepo = createUsersRepository(fastify.drizzle);
  const authService = createAuthService(usersRepo);
  fastify.decorate('authService', authService);

  // кеш утиліти
  const cacheUtils = createCacheUtils(fastify.redis);
  fastify.decorate('cacheUtils', cacheUtils);

  await fastify.register(helmet, { global: true });
  await fastify.register(cors, {
    origin: isDev ? '*' : 'https://example.com',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true, // потрібно для cookies
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: fastify.redis,
  });

  // cookie ДО session
  await fastify.register(fastifyCookie);

  // session з Redis store — TTL 24 години
  await fastify.register(fastifySession, {
    secret: fastify.config.SESSION_SECRET,
    store: new RedisStore({ client: fastify.redis }),
    cookie: {
      httpOnly: true, // недоступний з JS — захист від XSS
      secure: !isDev, // тільки HTTPS в production
      maxAge: 86400000, // 24 години в мілісекундах
    },
    saveUninitialized: false, // не зберігаємо порожні сесії
  });

  // декоратор для захисту маршрутів
  fastify.decorate('authenticate', async (request, reply) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Inventory API',
        description: "REST API для управління складом комп'ютерної техніки",
        version: '1.0.0',
      },
      tags: [
        { name: 'products', description: 'Управління продуктами' },
        { name: 'orders', description: 'Управління замовленнями' },
        { name: 'github', description: 'Аналітика GitHub репозиторіїв' },
        { name: 'health', description: 'Стан сервера' },
        { name: 'auth', description: 'Автентифікація' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  await fastify.register(sensible);
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });
  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  fastify.setErrorHandler(errorHandler);

  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(productsRoutes, { prefix: '/api/v1' });
  await fastify.register(ordersRoutes, { prefix: '/api/v1' });
  await fastify.register(productsRoutesV2, { prefix: '/api/v2' });
  await fastify.register(githubRoutes);
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
