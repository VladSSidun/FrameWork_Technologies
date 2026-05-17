// backup.utils.js — створює стиснений .gz бекап через pipeline
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

const DATA_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
const MAX_BACKUPS = 5;

export const createBackup = async (log) => {
  try {
    let files;
    try {
      files = await fs.readdir(DATA_DIR);
    } catch {
      log.info('No data to backup');
      return;
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    if (jsonFiles.length === 0) {
      log.info('No data to backup');
      return;
    }

    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    // читаємо всі файли і об'єднуємо в один рядок JSON
    const allItems = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        return JSON.parse(content);
      })
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

    // pipeline: рядок → Readable stream → gzip стиснення → файл
    await pipeline(
      Readable.from(JSON.stringify(allItems)),
      createGzip(),
      createWriteStream(backupPath)
    );

    log.info(`Backup created: data/backups/${timestamp}.gz`);

    // видаляємо старі бекапи якщо більше 5
    const allBackups = await fs.readdir(BACKUPS_DIR);
    const gzBackups = allBackups.filter((f) => f.endsWith('.gz')).sort();

    if (gzBackups.length > MAX_BACKUPS) {
      const toDelete = gzBackups.slice(0, gzBackups.length - MAX_BACKUPS);
      await Promise.all(
        toDelete.map((file) => {
          log.info(`Removing old backup: ${file}`);
          return fs.unlink(path.join(BACKUPS_DIR, file));
        })
      );
    }
  } catch (error) {
    log.error(error, 'Backup failed');
  }
};
