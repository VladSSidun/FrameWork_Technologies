// Маршрути для продуктів.
// Схеми тут описані inline — або можна імпортувати з schemas/.

import {
  create,
  getAll,
  getById,
  remove,
  update,
} from '#controllers/products.controller.js';

import {
  createProductBody,
  idParam,
  productSchema,
  updateProductBody,
} from '#schemas/product.schema.js';

import * as productsService from '#services/products.service.js';
import { buildImageUrl } from '#utils/image-url.js';
import { stringify } from 'csv-stringify/sync';

import * as productsRepository from '#repositories/products.repository.js';
import { parse } from 'csv-parse/sync';

import { MESSAGES } from '#constants/messages.js';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

export default async function productsRoutes(fastify) {
  fastify.addSchema(productSchema);

  // ВАЖЛИВО: /products/export має бути ДО /products/:id
  // інакше Fastify сприйме рядок 'export' як значення :id
  fastify.get('/products/export', async (request, reply) => {
    const products = await productsService.findAll();

    const rows = products.map((p) => ({
      ...p,
      image: buildImageUrl(request, p.image),
    }));

    const csv = stringify(rows, { header: true });

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="products.csv"')
      .send(csv);
  });

  // POST /api/products/import — імпорт з CSV або JSON файлу
  fastify.post('/products/import', async (request, reply) => {
    const data = await request.file();

    if (!data) throw reply.badRequest('Файл не завантажено');

    // Визначаємо формат за mimetype або розширенням файлу
    const isJson =
      data.mimetype === 'application/json' || data.filename.endsWith('.json');
    const isCsv =
      data.mimetype === 'text/csv' || data.filename.endsWith('.csv');

    if (!isJson && !isCsv) {
      throw reply.badRequest('Підтримуються тільки CSV та JSON формати');
    }

    const buffer = await data.toBuffer();
    let items;

    // Парсимо файл залежно від формату
    if (isJson) {
      items = JSON.parse(buffer.toString());
    } else {
      // columns: true — перший рядок як назви полів
      // skip_empty_lines: true — пропускаємо порожні рядки
      items = parse(buffer, { columns: true, skip_empty_lines: true });
    }

    if (!Array.isArray(items)) {
      throw reply.badRequest('Файл має містити масив записів');
    }

    // Обробляємо кожен запис — валідуємо і зберігаємо
    let imported = 0;
    const rejected = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Проста валідація — перевіряємо обов'язкові поля
      if (!item.name || item.name.toString().trim() === '') {
        rejected.push({ index: i + 1, reason: 'Відсутнє поле name' });
        continue;
      }

      const price = parseFloat(item.price);
      if (isNaN(price) || price < 0) {
        rejected.push({ index: i + 1, reason: 'Некоректне поле price' });
        continue;
      }

      const qty = parseInt(item.qty, 10);
      if (isNaN(qty) || qty < 0) {
        rejected.push({ index: i + 1, reason: 'Некоректне поле qty' });
        continue;
      }

      // Зберігаємо через repository
      await productsRepository.create({
        name: item.name.toString().trim(),
        price,
        qty,
        category: item.category?.toString().trim() || '',
      });

      imported++;
    }

    // Повертаємо звіт
    return reply.send({
      imported,
      rejected: rejected.length,
      details: rejected,
    });
  });

  fastify.get(
    '/products',
    {
      schema: {
        response: {
          200: { type: 'array', items: { $ref: 'Product#' } },
        },
      },
    },
    getAll
  );

  fastify.get(
    '/products/:id',
    {
      schema: {
        params: idParam,
        response: { 200: { $ref: 'Product#' } },
      },
    },
    getById
  );

  fastify.post(
    '/products',
    {
      schema: {
        body: createProductBody,
        response: { 201: { $ref: 'Product#' } },
      },
    },
    create
  );

  fastify.patch(
    '/products/:id',
    {
      schema: {
        params: idParam,
        body: updateProductBody,
        response: { 200: { $ref: 'Product#' } },
      },
    },
    update
  );

  fastify.delete(
    '/products/:id',
    {
      schema: { params: idParam },
    },
    remove
  );

  // POST /api/products/:id/image — завантаження зображення
  fastify.post(
    '/products/:id/image',
    {
      schema: {
        params: idParam,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Перевіряємо чи існує продукт
      const product = await productsService.findById(id);
      if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

      const data = await request.file();
      if (!data) throw reply.badRequest('Зображення не завантажено');

      // Перевіряємо тип файлу — тільки JPEG і PNG
      if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
        throw reply.badRequest('Дозволені тільки JPEG та PNG зображення');
      }

      // Визначаємо розширення файлу
      const ext = data.mimetype === 'image/jpeg' ? '.jpg' : '.png';

      // Створюємо директорію uploads/{id}/
      const uploadDir = path.join(process.cwd(), 'uploads', String(id));
      await fs.mkdir(uploadDir, { recursive: true });

      // Зберігаємо файл через stream — без завантаження в пам'ять
      const filePath = path.join(uploadDir, `image${ext}`);
      const writable = createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        data.file.pipe(writable);
        data.file.on('end', resolve);
        data.file.on('error', reject);
      });

      // Зберігаємо відносний шлях в файлі продукту
      // Відносний а не повний URL — бо домен може змінитись
      const imagePath = `/${id}/image${ext}`;
      const updated = await productsService.update(id, { image: imagePath });

      // Повертаємо продукт з повним URL зображення
      return reply.send({
        ...updated,
        image: buildImageUrl(request, imagePath),
      });
    }
  );
}
