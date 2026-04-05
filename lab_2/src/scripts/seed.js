// Seed скрипт — переносить початкові дані у файли.
// Запускається один раз: npm run seed
// Після цього масив більше не потрібен в основному коді.

import { ItemModel } from '#models/item.model.js';
import { writeAtomic } from '#utils/fs.utils.js';
import path from 'path';

// Початкові дані — перенесені сюди з products.repository.js
const initialProducts = [
  {
    id: 1,
    name: 'Laptop Pro',
    price: 1299.99,
    qty: 10,
    category: 'electronics',
  },
  {
    id: 2,
    name: 'Wireless Mouse',
    price: 29.99,
    qty: 50,
    category: 'accessories',
  },
  { id: 3, name: 'USB-C Hub', price: 49.99, qty: 30, category: 'accessories' },
];

const DATA_DIR = path.join(process.cwd(), 'data', 'items');

const seed = async () => {
  console.log('Seeding initial data...');

  for (const item of initialProducts) {
    // Використовуємо ItemModel як шаблон — гарантує всі поля присутні
    const product = { ...ItemModel, ...item };
    const filePath = path.join(DATA_DIR, `${item.id}.json`);

    await writeAtomic(filePath, product);
    console.log(`Created: data/items/${item.id}.json`);
  }

  console.log('Seed completed!');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
