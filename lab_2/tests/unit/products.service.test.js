// unit тести для products service — перевіряємо логіку з моками
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProductsService } from '../../services/products.service.js';

describe('ProductsService', () => {
  let mockRepo;
  let mockRedis;
  let service;

  beforeEach(() => {
    // мок репозиторію — імітує файлову систему або БД
    mockRepo = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Laptop',
          price: 1299.99,
          qty: 10,
          category: 'electronics',
        },
        {
          id: 2,
          name: 'Mouse',
          price: 29.99,
          qty: 50,
          category: 'accessories',
        },
      ]),
      findById: vi
        .fn()
        .mockResolvedValue({
          id: 1,
          name: 'Laptop',
          price: 1299.99,
          qty: 10,
          category: 'electronics',
        }),
      create: vi
        .fn()
        .mockResolvedValue({
          id: 3,
          name: 'Keyboard',
          price: 79.99,
          qty: 20,
          category: 'accessories',
        }),
      update: vi
        .fn()
        .mockResolvedValue({
          id: 1,
          name: 'Laptop',
          price: 999,
          qty: 10,
          category: 'electronics',
        }),
      remove: vi.fn().mockResolvedValue(true),
    };

    // мок Redis — імітує кеш
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    };

    service = createProductsService(mockRepo, mockRedis);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('повертає всі продукти', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('повертає продукт за id', async () => {
      const result = await service.findById(1);
      expect(result).toMatchObject({ id: 1, name: 'Laptop' });
      expect(mockRepo.findById).toHaveBeenCalledWith(1);
    });

    it('повертає undefined якщо продукт не знайдено', async () => {
      mockRepo.findById.mockResolvedValueOnce(undefined);
      const result = await service.findById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('створює продукт і інвалідує кеш', async () => {
      const data = { name: 'Keyboard', price: 79.99, qty: 20 };
      const result = await service.create(data);

      expect(result).toMatchObject({ name: 'Keyboard' });
      expect(mockRepo.create).toHaveBeenCalledWith(data);
      // після створення кеш має бути інвалідований
      expect(mockRedis.keys).toHaveBeenCalled();
    });

    it('інвалідує кеш після створення', async () => {
      mockRedis.keys.mockResolvedValueOnce(['cache:products:list:1:10']);
      await service.create({ name: 'Test', price: 10, qty: 1 });
      expect(mockRedis.del).toHaveBeenCalledWith('cache:products:list:1:10');
    });
  });

  describe('update', () => {
    it('оновлює продукт і інвалідує кеш', async () => {
      const result = await service.update(1, { price: 999 });
      expect(result).toMatchObject({ price: 999 });
      expect(mockRepo.update).toHaveBeenCalledWith(1, { price: 999 });
      expect(mockRedis.keys).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('видаляє продукт і повертає true', async () => {
      const result = await service.remove(1);
      expect(result).toBe(true);
      expect(mockRepo.remove).toHaveBeenCalledWith(1);
      expect(mockRedis.keys).toHaveBeenCalled();
    });

    it('повертає false якщо продукт не знайдено', async () => {
      mockRepo.remove.mockResolvedValueOnce(false);
      const result = await service.remove(999);
      expect(result).toBe(false);
    });
  });

  describe('findAllCached', () => {
    it('повертає дані з кешу якщо є', async () => {
      const cached = [{ id: 1, name: 'Laptop' }];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

      const result = await service.findAllCached(1, 10);
      expect(result).toEqual(cached);
      // не звертається до БД
      expect(mockRepo.findAll).not.toHaveBeenCalled();
    });

    it('іде в БД якщо кеш порожній і зберігає результат', async () => {
      const result = await service.findAllCached(1, 10);
      expect(result).toHaveLength(2);
      expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
      // зберігає в кеш
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });
});
