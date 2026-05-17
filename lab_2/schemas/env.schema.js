// Схема для fastify/env — описує які змінні .env потрібні серверу.
// Якщо якась змінна відсутня або має неправильний тип —  сервер не запуститься і видасть зрозуміле повідомлення про помилку.

export const envSchema = {
  type: 'object',
  required: ['PORT', 'HOST', 'NODE_ENV', 'ADMIN_API_KEY'],
  properties: {
    PORT: { type: 'integer', default: 3000 },
    HOST: { type: 'string', default: 'localhost' },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
    },
    ADMIN_API_KEY: { type: 'string', minLength: 8 },
    GITHUB_TOKEN: { type: 'string', default: '' },
    // курс долара до гривні для трансформації цін при експорті
    USD_TO_UAH: { type: 'number', default: 41.5 },
  },
};
