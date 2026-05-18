// unit тести для cache utils
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCacheUtils } from '../../utils/cache.utils.js';

describe('CacheUtils', () => {
  let mockRedis;
  let cacheUtils;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue('OK'),
    };
    cacheUtils = createCacheUtils(mockRedis);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFromCache', () => {
    it('повертає розпарсені дані якщо ключ існує', async () => {
      const data = { id: 1, name: 'Electronics' };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(data));

      const result = await cacheUtils.getFromCache('test:key');
      expect(result).toEqual(data);
      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    });

    it('повертає null якщо ключ не існує', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await cacheUtils.getFromCache('test:key');
      expect(result).toBeNull();
    });
  });

  describe('saveToCache', () => {
    it('зберігає дані з TTL', async () => {
      const data = { id: 1, name: 'Electronics' };
      await cacheUtils.saveToCache('test:key', data, 120);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify(data),
        'EX',
        120
      );
    });

    it('використовує дефолтний TTL 120 секунд', async () => {
      await cacheUtils.saveToCache('test:key', { data: 'test' });
      const call = mockRedis.set.mock.calls[0];
      expect(call[2]).toBe('EX');
      expect(call[3]).toBe(120);
    });
  });
});
