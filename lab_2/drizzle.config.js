// drizzle.config.js — конфігурація Drizzle Kit для генерації міграцій
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    // eslint-disable-next-line no-process-env
    host: process.env.MYSQL_HOST ?? 'localhost',
    // eslint-disable-next-line no-process-env
    port: parseInt(process.env.MYSQL_PORT ?? '3306'),
    // eslint-disable-next-line no-process-env
    user: process.env.MYSQL_USER ?? 'root',
    // eslint-disable-next-line no-process-env
    password: process.env.MYSQL_PASSWORD ?? '',
    // eslint-disable-next-line no-process-env
    database: process.env.MYSQL_DB ?? 'inventory',
  },
});
