// mysql.js — Fastify плагін підключення до MySQL через пул з'єднань
import fp from 'fastify-plugin';
import mysql from 'mysql2/promise';

async function mysqlPlugin(fastify) {
  const pool = mysql.createPool({
    host: fastify.config.MYSQL_HOST,
    port: fastify.config.MYSQL_PORT,
    user: fastify.config.MYSQL_USER,
    password: fastify.config.MYSQL_PASSWORD,
    database: fastify.config.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // перевіряємо що пул працює
  try {
    const connection = await pool.getConnection();
    connection.release();
    fastify.log.info('MySQL pool connected');
  } catch (err) {
    fastify.log.error(err, 'MySQL connection error');
    process.exit(1);
  }

  // decorate — робить пул доступним як fastify.mysql скрізь
  fastify.decorate('mysql', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
    fastify.log.info('MySQL pool closed');
  });
}

export default fp(mysqlPlugin, { name: 'mysql-plugin' });
