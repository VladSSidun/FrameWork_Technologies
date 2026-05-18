// integration тести для products API
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { products, users } from '../../db/schema.js';

describe('Products API', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.drizzle.delete(products);
    await app.drizzle.delete(users);
    await app.redis.flushdb();

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'test@test.com', password: 'password123' },
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@test.com', password: 'password123' },
    });
    authToken = loginRes.json().accessToken;
  });

  describe('GET /api/v1/products', () => {
    it('повертає порожній масив якщо продуктів немає', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/products' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it('повертає список продуктів', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Laptop',
          price: 1299.99,
          qty: 10,
          category: 'electronics',
        },
      });

      // очищуємо Redis кеш щоб GET пішов в БД
      await app.redis.flushdb();

      const res = await app.inject({ method: 'GET', url: '/api/v1/products' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });
  });

  describe('POST /api/v1/products', () => {
    it('повертає 401 без токена', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        payload: { name: 'Test', price: 99, qty: 5 },
      });
      expect(res.statusCode).toBe(401);
    });

    it('створює продукт з валідним токеном', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Laptop',
          price: 1299.99,
          qty: 10,
          category: 'electronics',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ name: 'Laptop', price: 1299.99 });
      expect(res.json()).toHaveProperty('id');
    });

    it('повертає 400 при відсутності обовязкових полів', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { price: 99 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('повертає продукт за id', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { name: 'Mouse', price: 29.99, qty: 50 },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ name: 'Mouse' });
    });

    it('повертає 404 для неіснуючого id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/999999',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('оновлює продукт', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { name: 'Laptop', price: 1299.99, qty: 10 },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/products/${id}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { price: 999 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ price: 999 });
    });

    it('повертає 401 без токена', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/1',
        payload: { price: 999 },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('видаляє продукт', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/v1/products',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { name: 'Hub', price: 49.99, qty: 30 },
      });
      const { id } = created.json();

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/products/${id}`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('повертає 404 для неіснуючого id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/products/999999',
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
