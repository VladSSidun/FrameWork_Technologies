// Утиліта для створення бекапів при кожному запуску сервера.
// Зберігає не більше 5 останніх бекапів — старіші видаляє автоматично.

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
const MAX_BACKUPS = 5;

export const createBackup = async (log) => {
  try {
    // Читаємо всі файли з data/items/
    let files;
    try {
      files = await fs.readdir(DATA_DIR);
    } catch {
      // data/items/ порожня або не існує — бекап не потрібен
      log.info('No data to backup');
      return;
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      log.info('No data to backup');
      return;
    }

    // Створюємо папку бекапу з поточним timestamp
    // Наприклад: data/backups/2026-03-31T19-12-33/
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(BACKUPS_DIR, timestamp);
    await fs.mkdir(backupDir, { recursive: true });

    // Копіюємо всі файли в папку бекапу
    await Promise.all(
      jsonFiles.map((file) =>
        fs.copyFile(path.join(DATA_DIR, file), path.join(backupDir, file))
      )
    );

    log.info(`Backup created: data/backups/${timestamp}`);

    // Залишаємо тільки 5 останніх бекапів
    // Читаємо всі папки бекапів і сортуємо за назвою (timestamp)
    const allBackups = await fs.readdir(BACKUPS_DIR);
    const sorted = allBackups.sort(); // ISO рядки сортуються хронологічно

    if (sorted.length > MAX_BACKUPS) {
      // Видаляємо найстаріші — все що виходить за ліміт
      const toDelete = sorted.slice(0, sorted.length - MAX_BACKUPS);

      await Promise.all(
        toDelete.map((dir) => {
          log.info(`Removing old backup: ${dir}`);
          return fs.rm(path.join(BACKUPS_DIR, dir), { recursive: true });
        })
      );
    }
  } catch (error) {
    // Бекап не критичний — логуємо помилку але не зупиняємо сервер
    log.error(error, 'Backup failed');
  }
};
