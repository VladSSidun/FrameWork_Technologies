import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { users } from '../../db/schema.js';

describe('Auth API', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.drizzle.delete(users);
    await app.redis.flushdb();
  });

  describe('POST /auth/register', () => {
    it('реєструє нового користувача', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'new@test.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ email: 'new@test.com' });
      expect(res.json()).not.toHaveProperty('password');
    });

    it('повертає 409 якщо email вже зайнятий', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'dup@test.com', password: 'password123' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'dup@test.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('повертає 400 при невалідному email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'notanemail', password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('повертає 400 якщо пароль коротший 8 символів', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'test@test.com', password: '123' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('повертає access token при успішному вході', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'login@test.com', password: 'password123' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'login@test.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('accessToken');
    });

    it('повертає 401 при невірному паролі', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'login2@test.com', password: 'password123' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'login2@test.com', password: 'wrongpassword' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('повертає 401 якщо користувач не існує', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'notexist@test.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('розлогінює користувача і токен потрапляє в blacklist', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'logout@test.com', password: 'password123' },
      });
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'logout@test.com', password: 'password123' },
      });
      const { accessToken } = loginRes.json();

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(logoutRes.statusCode).toBe(204);

      const meRes = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(meRes.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('повертає поточного користувача', async () => {
      // реєструємось і одразу логінимось і робимо запит в рамках одного beforeEach циклу
      const registerRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'me@test.com', password: 'password123' },
      });
      const userId = registerRes.json().id;

      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'me@test.com', password: 'password123' },
      });
      const { accessToken } = loginRes.json();

      // робимо запит одразу — до того як інший тест може видалити users
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: userId, email: 'me@test.com' });
    });

    it('повертає 401 без токена', async () => {
      const res = await app.inject({ method: 'GET', url: '/auth/me' });
      expect(res.statusCode).toBe(401);
    });
  });
});
