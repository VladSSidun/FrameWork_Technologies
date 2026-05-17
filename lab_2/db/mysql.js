// mysql.js — Fastify плагін підключення до MySQL через пул з'єднань
import crypto from 'crypto';
import fp from 'fastify-plugin';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';

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

  // міграція — порівнюємо хеш схеми з записом в БД
  try {
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    const currentHash = crypto.createHash('md5').update(schema).digest('hex');

    const [rows] = await pool.execute(
      'SELECT hash FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      await pool.execute('INSERT INTO migrations (hash) VALUES (?)', [
        currentHash,
      ]);
      fastify.log.info('Migration hash saved');
    } else if (rows[0].hash !== currentHash) {
      fastify.log.warn(
        'Schema changed — hash mismatch. Consider updating the DB structure.'
      );
      await pool.execute('INSERT INTO migrations (hash) VALUES (?)', [
        currentHash,
      ]);
    } else {
      fastify.log.info('Schema is up to date');
    }
  } catch (err) {
    fastify.log.warn({ err }, 'Migration check failed');
  }

  fastify.addHook('onClose', async () => {
    await pool.end();
    fastify.log.info('MySQL pool closed');
  });
}

export default fp(mysqlPlugin);
