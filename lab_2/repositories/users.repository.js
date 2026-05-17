// users.repository.js — робота з таблицею users через Drizzle
import { users } from '#db/schema.js';
import { eq } from 'drizzle-orm';

export const createUsersRepository = (db) => ({
  findByEmail: async (email) => {
    const rows = await db.select().from(users).where(eq(users.email, email));
    return rows[0] ?? null;
  },

  findById: async (id) => {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0] ?? null;
  },

  create: async (data) => {
    const [result] = await db.insert(users).values(data);
    return { id: result.insertId, email: data.email };
  },
});
