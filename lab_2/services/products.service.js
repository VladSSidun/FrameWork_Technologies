// products.service.js — бізнес логіка з кешуванням через Redis
import { REDIS_KEYS } from '#constants/redis-keys.js';

export const createProductsService = (repo, redis) => ({
  findAll: () => repo.findAll(),

  findById: (id) => repo.findById(id),

  // при створенні — інвалідуємо кеш списку
  create: async (data) => {
    const product = await repo.create(data);
    if (redis) await invalidateListCache(redis);
    return product;
  },

  // при оновленні — інвалідуємо кеш
  update: async (id, data) => {
    const product = await repo.update(id, data);
    if (redis) await invalidateListCache(redis);
    return product;
  },

  // при видаленні — інвалідуємо кеш
  remove: async (id) => {
    const success = await repo.remove(id);
    if (redis) await invalidateListCache(redis);
    return success;
  },

  // отримати список з кешем — використовується в v2 з пагінацією
  findAllCached: async (page, limit) => {
    if (!redis) return repo.findAll();

    const cacheKey = REDIS_KEYS.productsList(page, limit);
    const cached = await redis.get(cacheKey);

    if (cached !== null) {
      return JSON.parse(cached);
    }

    const products = await repo.findAll();
    // TTL 24 години = 86400 секунд
    await redis.set(cacheKey, JSON.stringify(products), 'EX', 86400);
    return products;
  },
});

// видаляємо всі ключі кешу списку продуктів
const invalidateListCache = async (redis) => {
  const keys = await redis.keys(REDIS_KEYS.productsListPattern());
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
