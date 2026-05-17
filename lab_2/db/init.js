// init.js — створює таблиці якщо не існують
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';

const run = async () => {
  // eslint-disable-next-line no-process-env
  const connection = await mysql.createConnection({
    // eslint-disable-next-line no-process-env
    host: process.env.MYSQL_HOST,
    // eslint-disable-next-line no-process-env
    port: parseInt(process.env.MYSQL_PORT),
    // eslint-disable-next-line no-process-env
    user: process.env.MYSQL_USER,
    // eslint-disable-next-line no-process-env
    password: process.env.MYSQL_PASSWORD,
    // eslint-disable-next-line no-process-env
    database: process.env.MYSQL_DB,
    multipleStatements: true,
  });

  const sql = await fs.readFile(
    path.join(process.cwd(), 'db', 'schema.sql'),
    'utf8'
  );
  await connection.query(sql);
  console.log('Tables created successfully');
  await connection.end();
};

run().catch((err) => {
  console.error('Init failed:', err);
  process.exit(1);
});
