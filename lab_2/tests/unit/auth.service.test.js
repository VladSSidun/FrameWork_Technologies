// unit тести для auth service — реєстрація та вхід
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthService } from '../../services/auth.service.js';

describe('AuthService', () => {
  let mockUsersRepo;
  let service;

  beforeEach(() => {
    mockUsersRepo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi
        .fn()
        .mockResolvedValue({ id: 1, email: 'test@test.com', password: 'hash' }),
      create: vi.fn().mockResolvedValue({ id: 1, email: 'test@test.com' }),
    };
    service = createAuthService(mockUsersRepo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('реєструє нового користувача', async () => {
      const result = await service.register('test@test.com', 'password123');
      expect(result.user).toMatchObject({ email: 'test@test.com' });
      expect(mockUsersRepo.create).toHaveBeenCalledTimes(1);
    });

    it('повертає помилку якщо email вже зайнятий', async () => {
      mockUsersRepo.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'test@test.com',
      });
      const result = await service.register('test@test.com', 'password123');
      expect(result.error).toBe('EMAIL_TAKEN');
      expect(mockUsersRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('повертає помилку якщо користувач не знайдений', async () => {
      const result = await service.login('notexist@test.com', 'password123');
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });

    it('повертає помилку при невірному паролі', async () => {
      // передаємо реальний argon2 хеш щоб verify не падав
      const argon2 = await import('argon2');
      const hash = await argon2.hash('correctpassword');

      mockUsersRepo.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'test@test.com',
        password: hash,
      });
      // вводимо невірний пароль
      const result = await service.login('test@test.com', 'wrongpassword');
      expect(result.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('getById', () => {
    it('повертає користувача без поля password', async () => {
      mockUsersRepo.findById.mockResolvedValueOnce({
        id: 1,
        email: 'test@test.com',
        password: 'hash',
      });
      const result = await service.getById(1);
      expect(result).toMatchObject({ id: 1, email: 'test@test.com' });
      expect(result).not.toHaveProperty('password');
    });

    it('повертає null якщо користувач не знайдений', async () => {
      mockUsersRepo.findById.mockResolvedValueOnce(null);
      const result = await service.getById(999);
      expect(result).toBeNull();
    });
  });
});
