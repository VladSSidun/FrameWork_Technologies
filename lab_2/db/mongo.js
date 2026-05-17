// mongo.js — Fastify плагін підключення до MongoDB
import fp from 'fastify-plugin';
import mongoose from 'mongoose';

async function mongoPlugin(fastify) {
  try {
    await mongoose.connect(fastify.config.MONGO_URL, {
      dbName: fastify.config.MONGO_DB_NAME,
    });
    fastify.log.info('MongoDB connected');
    // decorate — робить mongoose доступним як fastify.mongoose скрізь
    fastify.decorate('mongoose', mongoose);
  } catch (err) {
    fastify.log.error(err, 'MongoDB connection error');
    process.exit(1);
  }

  // закриваємо з'єднання коли сервер зупиняється
  fastify.addHook('onClose', async () => {
    await mongoose.connection.close();
    fastify.log.info('MongoDB connection closed');
  });
}

// fp() знімає інкапсуляцію — декоратор видно всьому додатку
export default fp(mongoPlugin);
