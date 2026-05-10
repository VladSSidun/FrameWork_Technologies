// ── utils/cache.utils.js ──────────────────────────────────
// Простий файловий кеш з TTL (Time To Live)
// Зберігає відповідь зовнішнього сервісу щоб не робити зайвих запитів
import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache', 'reference.json');

// TTL = 120 секунд — кеш актуальний 2 хвилини
const CACHE_TTL_SECONDS = 120;

// getFromCache — повертає дані з кешу якщо вони ще свіжі
// Повертає null якщо кеш відсутній або застарів
export const getFromCache = async () => {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf8');
    const cache = JSON.parse(content);

    // Перевіряємо вік кешу в секундах
    const ageSeconds = (Date.now() - cache.savedAt) / 1000;

    if (ageSeconds < CACHE_TTL_SECONDS) {
      // Кеш ще свіжий — повертаємо дані
      return cache.data;
    }

    // Кеш застарів
    return null;
  } catch {
    // Файл не існує або пошкоджений — кешу немає
    return null;
  }
};

// saveToCache — зберігає дані у файл разом з поточним часом
export const saveToCache = async (data) => {
  const dir = path.dirname(CACHE_FILE);

  // Створюємо папку data/cache/ якщо не існує
  await fs.mkdir(dir, { recursive: true });

  const cache = {
    savedAt: Date.now(), // мітка часу для розрахунку TTL
    data,
  };

  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
};
