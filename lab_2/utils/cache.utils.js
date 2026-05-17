// cache.utils.js - файловий кеш з TTL для відповідей зовнішнього сервісу

import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache', 'reference.json');
const CACHE_TTL_SECONDS = 120; // кеш живе 2 хвилини

// повертає дані з кешу якщо вони ще свіжі, інакше null
export const getFromCache = async () => {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf8');
    const cache = JSON.parse(content);

    // рахуємо скільки секунд пройшло з моменту збереження
    const ageSeconds = (Date.now() - cache.savedAt) / 1000;

    if (ageSeconds < CACHE_TTL_SECONDS) return cache.data;

    return null; // кеш є але вже протух
  } catch {
    return null; // файлу немає або пошкоджений
  }
};

// зберігає дані у файл разом з поточним часом
export const saveToCache = async (data) => {
  const dir = path.dirname(CACHE_FILE);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(
    CACHE_FILE,
    JSON.stringify({ savedAt: Date.now(), data }, null, 2),
    'utf8'
  );
};
