// products.repository.js — робота з MySQL через mysql2
// db (пул з'єднань) передається через DI з app.js

export const createProductsRepository = (db) => ({
  findAll: async () => {
    const [rows] = await db.execute('SELECT * FROM products');
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [
      id,
    ]);
    return rows[0] ?? undefined;
  },

  create: async (data) => {
    const [result] = await db.execute(
      'INSERT INTO products (name, price, qty, category, image, discount) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.name,
        data.price,
        data.qty ?? 0,
        data.category ?? null,
        data.image ?? null,
        data.discount ?? 0,
      ]
    );
    // insertId — автоматично згенерований id через AUTO_INCREMENT
    return { id: result.insertId, ...data };
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];

    // динамічно будуємо SET частину запиту — тільки передані поля
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.price !== undefined) {
      fields.push('price = ?');
      values.push(data.price);
    }
    if (data.qty !== undefined) {
      fields.push('qty = ?');
      values.push(data.qty);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.image !== undefined) {
      fields.push('image = ?');
      values.push(data.image);
    }
    if (data.discount !== undefined) {
      fields.push('discount = ?');
      values.push(data.discount);
    }

    if (fields.length === 0) return null;

    values.push(id);
    await db.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [
      id,
    ]);
    return rows[0] ?? null;
  },

  remove: async (id) => {
    const [result] = await db.execute('DELETE FROM products WHERE id = ?', [
      id,
    ]);
    // affectedRows > 0 — рядок був знайдений і видалений
    return result.affectedRows > 0;
  },
});
