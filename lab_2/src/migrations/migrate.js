// Міграція даних — оновлює існуючі файли якщо модель змінилась.
// Алгоритм:
// 1. Рахуємо MD5 хеш поточної моделі
// 2. Порівнюємо з хешем в data/version.json
// 3. Якщо відрізняються — додаємо відсутні поля до всіх файлів
// 4. Оновлюємо data/version.json новим хешем

import { ItemModel } from '#models/item.model.js';
import { readJson, writeAtomic } from '#utils/fs.utils.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'items');
const VERSION_FILE = path.join(process.cwd(), 'data', 'version.json');

// Рахує MD5 хеш поточної моделі
// Однакова модель → однаковий хеш
// Будь-яка зміна моделі → інший хеш
export const getModelHash = () =>
  crypto.createHash('md5').update(JSON.stringify(ItemModel)).digest('hex');

// Читає збережений хеш з data/version.json
// Якщо файл не існує — повертає null
const getSavedHash = async () => {
  try {
    const version = await readJson(VERSION_FILE);
    return version.hash;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

// Зберігає новий хеш в data/version.json
const saveHash = async (hash) => {
  await writeAtomic(VERSION_FILE, {
    hash,
    updatedAt: new Date().toISOString(),
  });
};

// Перевіряє чи потрібна міграція — порівнює хеші
export const isMigrationNeeded = async () => {
  const currentHash = getModelHash();
  const savedHash = await getSavedHash();
  return currentHash !== savedHash;
};

// Основна функція міграції
const migrate = async () => {
  console.log('Checking if migration is needed...');

  const currentHash = getModelHash();
  const savedHash = await getSavedHash();

  if (currentHash === savedHash) {
    console.log('Schema is up to date. No migration needed.');
    return;
  }

  console.log('Schema changed. Starting migration...');

  // Читаємо всі файли продуктів
  let files;
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    console.log('No data files found. Migration skipped.');
    await saveHash(currentHash);
    return;
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('No data files found. Migration skipped.');
    await saveHash(currentHash);
    return;
  }

  // Проходимо по кожному файлу і додаємо відсутні поля
  let migrated = 0;
  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file);
    const existing = await readJson(filePath);

    // ItemModel як джерело дефолтних значень:
    // спочатку дефолти, потім реальні дані поверх них
    // Так відсутні поля отримують дефолтне значення
    // а існуючі поля залишаються без змін
    const migrated_item = { ...ItemModel, ...existing }; // Останній обєкт перезаписує попередній

    await writeAtomic(filePath, migrated_item);
    console.log(`Migrated: ${file}`);
    migrated++;
  }

  // Зберігаємо новий хеш
  await saveHash(currentHash);
  console.log(`Migration completed. Updated ${migrated} files.`);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
