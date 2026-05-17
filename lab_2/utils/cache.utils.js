// cache.utils.js — кеш через Redis замість файлової системи
// TTL 120 секунд для даних категорій від json-server

export const createCacheUtils = (redis) => ({
  // повертає дані з кешу або null якщо немає/застарів
  getFromCache: async (key) => {
    const cached = await redis.get(key);
    if (cached === null) return null;
    return JSON.parse(cached);
  },

  // зберігає дані в Redis з TTL в секундах
  saveToCache: async (key, data, ttlSeconds = 120) => {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  },
});
