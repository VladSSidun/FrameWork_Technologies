// seed.js — початкові дані через Drizzle
import { products } from '#db/schema.js';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const initialProducts = [
  { name: 'Laptop Pro', price: '1299.99', qty: 10, category: 'electronics' },
  { name: 'Wireless Mouse', price: '29.99', qty: 50, category: 'accessories' },
  { name: 'USB-C Hub', price: '49.99', qty: 30, category: 'accessories' },
];

const seed = async (force = false) => {
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
  });

  const db = drizzle(connection, { mode: 'default' });

  const existing = await db.select().from(products);

  if (existing.length > 0 && !force) {
    console.log(
      `DB already has ${existing.length} products. Use seed:force to reset.`
    );
    await connection.end();
    return;
  }

  if (force) {
    await db.delete(products);
    console.log('Cleared existing products');
  }

  await db.insert(products).values(initialProducts);
  console.log(`Seeded ${initialProducts.length} products`);
  await connection.end();
};

seed(process.argv[2] === 'force').catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
