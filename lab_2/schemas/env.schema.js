// Схема для fastify/env — описує які змінні .env потрібні серверу.
// Якщо якась змінна відсутня або має неправильний тип —  сервер не запуститься і видасть зрозуміле повідомлення про помилку.

export const envSchema = {
  type: 'object',
  required: ['PORT', 'HOST', 'NODE_ENV', 'ADMIN_API_KEY'],
  properties: {
    PORT: {
      type: 'integer', // @fastify/env автоматично конвертує рядок "3000" → число 3000
      default: 3000,
    },
    HOST: {
      type: 'string',
      default: 'localhost',
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'], // тільки ці значення дозволені
    },
    ADMIN_API_KEY: {
      type: 'string',
      minLength: 8, // ключ має бути хоча б 8 символів
    },
  },
};
