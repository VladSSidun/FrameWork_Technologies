// Repository — тепер працює з файлами замість масиву.
// Кожен продукт зберігається як окремий файл data/items/{id}.json
// Інтерфейс (findAll, findById, create, update, remove) залишився той самий —
// controllers і services не знають про зміну сховища.

import { ItemModel } from '#models/item.model.js';
import { readJson, writeAtomic } from '#utils/fs.utils.js';
import fs from 'fs/promises';
import path from 'path';

// Директорія де зберігаються файли продуктів
const DATA_DIR = path.join(process.cwd(), 'data', 'items');

// Лічильник для нових id — читаємо максимальний існуючий id при старті
const getNextId = async () => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const ids = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => parseInt(f.replace('.json', ''), 10))
      .filter((n) => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  } catch {
    return 1;
  }
};

// Повертає всі продукти — читає всі .json файли з DATA_DIR
export const findAll = async () => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    // Читаємо всі файли паралельно через Promise.all
    const products = await Promise.all(
      jsonFiles.map((file) => readJson(path.join(DATA_DIR, file)))
    );

    return products;
  } catch (error) {
    // Якщо директорія порожня або не існує — повертаємо порожній масив
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

// Повертає продукт за id або undefined
export const findById = async (id) => {
  try {
    return await readJson(path.join(DATA_DIR, `${id}.json`));
  } catch (error) {
    // ENOENT — файл не існує, продукт не знайдено
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
};

// Створює новий файл продукту
// ItemModel використовується як шаблон — якщо поле відсутнє в data,
// береться дефолтне значення з моделі
export const create = async (data) => {
  const id = await getNextId();

  // Розпаковуємо: спочатку дефолти з моделі, потім реальні дані
  // Так гарантуємо що всі поля присутні навіть якщо data їх не містить
  const product = { ...ItemModel, ...data, id };

  await writeAtomic(path.join(DATA_DIR, `${id}.json`), product);
  return product;
};

// Оновлює існуючий файл продукту
export const update = async (id, data) => {
  const existing = await findById(id);
  if (!existing) return null;

  // Зберігаємо поточні дані і поверх них накладаємо нові
  const updated = { ...existing, ...data };

  await writeAtomic(path.join(DATA_DIR, `${id}.json`), updated);
  return updated;
};

// Видаляє файл продукту
export const remove = async (id) => {
  try {
    await fs.unlink(path.join(DATA_DIR, `${id}.json`));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};
