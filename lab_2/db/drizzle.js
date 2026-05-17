// drizzle.js — Fastify плагін Drizzle поверх mysql2 пулу
import { drizzle } from 'drizzle-orm/mysql2';
import fp from 'fastify-plugin';
import * as schema from './schema.js';

async function drizzlePlugin(fastify) {
  if (!fastify.mysql) {
    throw new Error('MySQL pool not registered. Register mysql plugin first.');
  }

  // drizzle працює поверх вже існуючого mysql2 пулу
  const db = drizzle(fastify.mysql, { schema, mode: 'default' });
  fastify.decorate('drizzle', db);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Drizzle layer closed');
  });
}

export default fp(drizzlePlugin, {
  name: 'drizzle-plugin',
  dependencies: ['mysql-plugin'],
});
