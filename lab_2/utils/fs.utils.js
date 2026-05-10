// Допоміжні функції для роботи з файловою системою.
// Виносимо сюди повторюваний код щоб не дублювати в repository і міграції.

import fs from 'fs/promises';
import path from 'path';

// Атомарний запис — гарантує цілісність файлу при збої.
// Спочатку пишемо у тимчасовий файл, потім перейменовуємо.
// fs.rename() — атомарна операція ОС: або файл замінився повністю,
// або залишився старий. Проміжного пошкодженого стану не існує.
export const writeAtomic = async (filePath, data) => {
  const tmp = `${filePath}.tmp`;
  const dir = path.dirname(filePath);

  try {
    // Створюємо директорію якщо її немає (recursive — не падає якщо вже є)
    await fs.mkdir(dir, { recursive: true });

    // Пишемо в тимчасовий файл
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');

    // Перейменовуємо — атомарна операція
    await fs.rename(tmp, filePath);
  } catch (error) {
    // При помилці видаляємо тимчасовий файл щоб не залишати сміття
    try {
      await fs.unlink(tmp);
    } catch (unlinkError) {
      // ENOENT — файл не встиг створитись
      if (unlinkError.code !== 'ENOENT') {
        console.error('Failed to cleanup tmp file:', unlinkError);
      }
    }
    throw error; // пробрасуємо оригінальну помилку далі
  }
};

// Читає JSON файл і повертає розібраний об'єкт
export const readJson = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};
