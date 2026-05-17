// auth.service.js — реєстрація та вхід через argon2
import argon2 from 'argon2';

export const createAuthService = (usersRepo) => ({
  register: async (email, password) => {
    const existing = await usersRepo.findByEmail(email);
    if (existing) return { error: 'EMAIL_TAKEN' };

    const hashedPassword = await argon2.hash(password);
    const user = await usersRepo.create({ email, password: hashedPassword });
    return { user };
  },

  login: async (email, password) => {
    const user = await usersRepo.findByEmail(email);
    if (!user) return { error: 'INVALID_CREDENTIALS' };

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) return { error: 'INVALID_CREDENTIALS' };

    return { user: { id: user.id, email: user.email } };
  },

  getById: async (id) => {
    const user = await usersRepo.findById(id);
    if (!user) return null;
    return { id: user.id, email: user.email };
  },
});
