// auth.route.js — JWT автентифікація
import { randomUUID } from 'node:crypto';

export default async function authRoutes(fastify) {
  // POST /auth/register
  fastify.post(
    '/auth/register',
    {
      schema: {
        description: 'Реєстрація нового користувача',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
          additionalProperties: false,
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const result = await request.server.authService.register(email, password);

      if (result.error === 'EMAIL_TAKEN') {
        throw reply.conflict('Користувач з таким email вже існує');
      }

      return reply.status(201).send(result.user);
    }
  );

  // POST /auth/login — повертає access token в body, refresh token в httpOnly cookie
  fastify.post(
    '/auth/login',
    {
      schema: {
        description:
          'Вхід. Повертає access token (body) та refresh token (cookie)',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const result = await request.server.authService.login(email, password);

      if (result.error === 'INVALID_CREDENTIALS') {
        throw reply.unauthorized('Невірний email або пароль');
      }

      const { user } = result;

      // access token — короткий TTL 15 хвилин, передається в заголовку Authorization
      const accessToken = await reply.jwtSign(
        { sub: user.id, email: user.email, jti: randomUUID() },
        { expiresIn: '15m' }
      );

      // refresh token — довгий TTL 7 днів, зберігається в Redis і cookie
      const refreshToken = await reply.jwtSign(
        { sub: user.id, jti: randomUUID() },
        { expiresIn: '7d' }
      );

      // зберігаємо refresh token в Redis — TTL 7 днів = 604800 секунд
      await fastify.redis.set(`refresh:${user.id}`, refreshToken, 'EX', 604800);

      // refresh token в httpOnly cookie — недоступний з JS
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: fastify.config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/auth/refresh', // cookie надсилається тільки на цей шлях
      });

      return reply.send({ accessToken });
    }
  );

  // POST /auth/refresh — оновлює access token через refresh token з cookie
  fastify.post(
    '/auth/refresh',
    {
      schema: {
        description: 'Оновити access token через refresh token з cookie',
        tags: ['auth'],
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies?.refreshToken;
      if (!refreshToken) throw reply.unauthorized('Refresh token відсутній');

      let decoded;
      try {
        // верифікуємо refresh token
        decoded = fastify.jwt.verify(refreshToken);
      } catch {
        throw reply.unauthorized('Невалідний refresh token');
      }

      // перевіряємо що refresh token є в Redis
      const stored = await fastify.redis.get(`refresh:${decoded.sub}`);
      if (!stored || stored !== refreshToken) {
        throw reply.unauthorized('Refresh token відкликано або не існує');
      }

      // генеруємо новий access token
      const accessToken = await reply.jwtSign(
        { sub: decoded.sub, jti: randomUUID() },
        { expiresIn: '15m' }
      );

      return reply.send({ accessToken });
    }
  );

  // POST /auth/logout — додає access token до blacklist, видаляє refresh token
  fastify.post(
    '/auth/logout',
    {
      schema: {
        description: 'Вихід. Інвалідує access token через blacklist',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
      },
      onRequest: [verifyJwt],
    },
    async (request, reply) => {
      const { jti, exp, sub } = request.user;

      // додаємо jti до blacklist з TTL до закінчення токена
      const currentTime = Math.floor(Date.now() / 1000);
      if (jti && exp > currentTime) {
        const ttl = exp - currentTime;
        await fastify.redis.set(`blacklist:${jti}`, '1', 'EX', ttl);
      }

      // видаляємо refresh token з Redis
      await fastify.redis.del(`refresh:${sub}`);

      // очищаємо cookie
      reply.clearCookie('refreshToken', { path: '/auth/refresh' });

      return reply.status(204).send();
    }
  );

  // GET /auth/me — поточний користувач
  fastify.get(
    '/auth/me',
    {
      schema: {
        description: 'Отримати поточного користувача',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              email: { type: 'string' },
            },
          },
        },
      },
      onRequest: [verifyJwt],
    },
    async (request, reply) => {
      const user = await request.server.authService.getById(request.user.sub);
      if (!user) throw reply.notFound('Користувача не знайдено');
      return reply.send(user);
    }
  );
}

// хук верифікації JWT — перевіряє підпис і blacklist автоматично
export async function verifyJwt(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
