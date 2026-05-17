// products.repository.js — робота з MySQL через Drizzle ORM
import { products } from '#db/schema.js';
import { eq } from 'drizzle-orm';

export const createProductsRepository = (db) => ({
  findAll: async () => {
    const rows = await db.select().from(products);
    // price повертається як рядок з MySQL DECIMAL — конвертуємо
    return rows.map((r) => ({ ...r, price: parseFloat(r.price) }));
  },

  findById: async (id) => {
    const rows = await db.select().from(products).where(eq(products.id, id));
    if (rows.length === 0) return undefined;
    return { ...rows[0], price: parseFloat(rows[0].price) };
  },

  create: async (data) => {
    const [result] = await db.insert(products).values({
      name: data.name,
      price: data.price,
      qty: data.qty ?? 0,
      category: data.category ?? null,
      image: data.image ?? null,
      discount: data.discount ?? 0,
    });
    // insertId — автоматично згенерований id
    return { id: result.insertId, ...data };
  },

  update: async (id, data) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.qty !== undefined) updateData.qty = data.qty;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.discount !== undefined) updateData.discount = data.discount;

    if (Object.keys(updateData).length === 0) return null;

    await db.update(products).set(updateData).where(eq(products.id, id));

    const rows = await db.select().from(products).where(eq(products.id, id));
    if (rows.length === 0) return null;
    return { ...rows[0], price: parseFloat(rows[0].price) };
  },

  remove: async (id) => {
    const [result] = await db.delete(products).where(eq(products.id, id));
    return result.affectedRows > 0;
  },
});
