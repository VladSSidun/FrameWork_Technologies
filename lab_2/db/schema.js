// schema.js — опис таблиці через Drizzle API
import { decimal, int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const products = mysqlTable('products', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  qty: int('qty').default(0),
  category: varchar('category', { length: 255 }),
  image: varchar('image', { length: 255 }),
  discount: int('discount').default(0),
});
