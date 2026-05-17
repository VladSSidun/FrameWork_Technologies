// auth.service.js — логіка реєстрації та входу
import argon2 from 'argon2';

export const createAuthService = (usersRepo) => ({
  register: async (email, password) => {
    // перевіряємо чи email вже зайнятий
    const existing = await usersRepo.findByEmail(email);
    if (existing) return { error: 'EMAIL_TAKEN' };

    // хешуємо пароль — argon2 автоматично генерує сіль
    const hashedPassword = await argon2.hash(password);
    const user = await usersRepo.create({ email, password: hashedPassword });
    return { user };
  },

  login: async (email, password) => {
    const user = await usersRepo.findByEmail(email);
    if (!user) return { error: 'INVALID_CREDENTIALS' };

    // порівнюємо введений пароль з хешем в БД
    const isValid = await argon2.verify(user.password, password);
    if (!isValid) return { error: 'INVALID_CREDENTIALS' };

    // повертаємо без поля password
    return { user: { id: user.id, email: user.email } };
  },

  getById: async (id) => {
    const user = await usersRepo.findById(id);
    if (!user) return null;
    // ніколи не повертаємо пароль
    return { id: user.id, email: user.email };
  },
});
