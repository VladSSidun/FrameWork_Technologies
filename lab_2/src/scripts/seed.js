// seed.js — початкові дані для MySQL
import mysql from 'mysql2/promise';

const initialProducts = [
  { name: 'Laptop Pro', price: 1299.99, qty: 10, category: 'electronics' },
  { name: 'Wireless Mouse', price: 29.99, qty: 50, category: 'accessories' },
  { name: 'USB-C Hub', price: 49.99, qty: 30, category: 'accessories' },
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

  const [rows] = await connection.execute(
    'SELECT COUNT(*) as count FROM products'
  );
  const count = rows[0].count;

  if (count > 0 && !force) {
    console.log(`DB already has ${count} products. Use seed:force to reset.`);
    await connection.end();
    return;
  }

  if (force) {
    await connection.execute('DELETE FROM products');
    console.log('Cleared existing products');
  }

  for (const product of initialProducts) {
    await connection.execute(
      'INSERT INTO products (name, price, qty, category) VALUES (?, ?, ?, ?)',
      [product.name, product.price, product.qty, product.category]
    );
  }

  console.log(`Seeded ${initialProducts.length} products`);
  await connection.end();
};

seed(process.argv[2] === 'force').catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
