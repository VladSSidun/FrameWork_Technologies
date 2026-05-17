// auth.route.js — ендпоінти реєстрації, входу, виходу
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

  // POST /auth/login
  fastify.post(
    '/auth/login',
    {
      schema: {
        description: 'Вхід в систему',
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
              success: { type: 'boolean' },
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

      // зберігаємо userId в сесії — сесія автоматично синхронізується з Redis
      request.session.userId = result.user.id;
      return reply.send({ success: true });
    }
  );

  // POST /auth/logout
  fastify.post(
    '/auth/logout',
    {
      schema: {
        description: 'Вихід з системи',
        tags: ['auth'],
        response: { 204: { type: 'null' } },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      // знищуємо сесію в Redis
      await request.session.destroy();
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
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = await request.server.authService.getById(
        request.session.userId
      );
      if (!user) throw reply.notFound('Користувача не знайдено');
      return reply.send(user);
    }
  );
}
