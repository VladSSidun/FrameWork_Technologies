// seed.js — початкові дані для MongoDB
import { Product } from '#db/models/product.model.js';
import mongoose from 'mongoose';

const initialProducts = [
  { name: 'Laptop Pro', price: 1299.99, qty: 10, category: 'electronics' },
  { name: 'Wireless Mouse', price: 29.99, qty: 50, category: 'accessories' },
  { name: 'USB-C Hub', price: 49.99, qty: 30, category: 'accessories' },
];

const seed = async (force = false) => {
  // eslint-disable-next-line no-process-env
  await mongoose.connect(process.env.MONGO_URL, {
    // eslint-disable-next-line no-process-env
    dbName: process.env.MONGO_DB_NAME,
  });

  const count = await Product.countDocuments();

  if (count > 0 && !force) {
    console.log(`DB already has ${count} products. Use seed:force to reset.`);
    await mongoose.connection.close();
    return;
  }

  if (force) {
    await Product.deleteMany({});
    console.log('Cleared existing products');
  }

  await Product.insertMany(initialProducts);
  console.log(`Seeded ${initialProducts.length} products`);
  await mongoose.connection.close();
};

// process.argv[2] === 'force' — якщо запущено npm run seed:force
seed(process.argv[2] === 'force').catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
