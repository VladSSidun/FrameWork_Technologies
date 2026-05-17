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
    USD_TO_UAH: { type: 'number', default: 41.5 },
    MYSQL_HOST: { type: 'string', default: 'localhost' },
    MYSQL_PORT: { type: 'integer', default: 3306 },
    MYSQL_USER: { type: 'string', default: 'root' },
    MYSQL_PASSWORD: { type: 'string', default: '' },
    MYSQL_DB: { type: 'string', default: 'inventory' },
  },
};
