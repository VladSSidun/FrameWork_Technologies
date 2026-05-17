// redis.js — Fastify плагін підключення до Redis
import fastifyRedis from '@fastify/redis';
import fp from 'fastify-plugin';

async function redisPlugin(fastify) {
  await fastify.register(fastifyRedis, {
    host: fastify.config.REDIS_HOST,
    port: fastify.config.REDIS_PORT,
    closeClient: true, // закриває з'єднання при зупинці сервера
  });
  fastify.log.info('Redis connected');
}

export default fp(redisPlugin, { name: 'redis-plugin' });
