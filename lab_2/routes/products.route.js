// Маршрути для продуктів.
// Схеми тут описані inline - або можна імпортувати з schemas/.

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

import * as productsRepository from '#repositories/products.repository.js';
import { parse } from 'csv-parse/sync';

import { MESSAGES } from '#constants/messages.js';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { getFromCache, saveToCache } from '#utils/cache.utils.js';
import { fetchWithRetry } from '#utils/fetch.utils.js';

import { createPriceTransform } from '#transforms/price-uah.transform.js';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export default async function productsRoutes(fastify) {
  fastify.addSchema(productSchema);

  fastify.get('/products/export', async (request, reply) => {
    const products = await productsService.findAll();
    const useTransform = request.query.transform === 'true';

    // ?transform=true — конвертуємо ціни в UAH через Transform stream
    if (useTransform) {
      const usdToUah = fastify.config.USD_TO_UAH;

      const priceTransform = createPriceTransform(usdToUah);

      // stringifier — Transform stream який перетворює об'єкти в CSV рядки
      const stringifier = stringify({ header: true });

      reply
        .header('Content-Type', 'text/csv')
        .header(
          'Content-Disposition',
          'attachment; filename="products-uah.csv"'
        );

      // pipeline: масив продуктів → конвертація цін → CSV рядки → HTTP відповідь
      await pipeline(
        Readable.from(products),
        priceTransform,
        stringifier,
        reply.raw
      );
      return;
    }

    // без transform — як раніше
    const rows = products.map((p) => ({
      ...p,
      image: buildImageUrl(request, p.image),
    }));
    const { stringify: stringifySync } = await import('csv-stringify/sync');
    const csv = stringifySync(rows, { header: true });
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="products.csv"')
      .send(csv);
  });

  // POST /api/products/import - імпорт з CSV або JSON файлу
  fastify.post('/products/import', async (request, reply) => {
    /*
    приймає файл через request.file(), 
    визначає формат за mimetype або розширенням,
    парсить CSV через parse() або JSON через JSON.parse(), 
    валідує кожен запис вручну, 
    зберігає валідні через productsRepository.create(), 
    повертає звіт { imported, rejected, details }
    */
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

    const buffer = await data.toBuffer(); // завантажуємо файл в пам'ять як Buffer
    let items;

    // Парсимо файл залежно від формату
    if (isJson) {
      items = JSON.parse(buffer.toString());
    } else {
      // columns: true - перший рядок як назви полів
      // skip_empty_lines: true - пропускаємо порожні рядки
      items = parse(buffer, { columns: true, skip_empty_lines: true });
    }

    if (!Array.isArray(items)) {
      throw reply.badRequest('Файл має містити масив записів');
    }

    // Обробляємо кожен запис - валідуємо і зберігаємо
    let imported = 0;
    const rejected = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Проста валідація - перевіряємо обов'язкові поля
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

  // GET /api/v1/products/:id/details
  // Повертає продукт + дані категорії з json-server
  // Реалізує: retry, timeout, кеш з TTL, graceful degradation
  fastify.get(
    '/products/:id/details',
    {
      schema: {
        description:
          'Отримати продукт з деталями категорії із зовнішнього сервісу',
        tags: ['products'],
        params: idParam,
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              price: { type: 'number' },
              qty: { type: 'integer' },
              category: { type: 'string' },
              image: {},
              discount: { type: 'integer' },
              // Дані з зовнішнього сервісу (json-server)
              // Можуть бути null якщо сервіс недоступний (graceful degradation)
              categoryDetails: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  tax: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      // Крок 1: отримуємо основні дані продукту з нашого сховища
      const product = await productsService.findById(id);
      if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

      let categoryDetails = null;

      // Крок 2: пробуємо отримати дані категорії з json-server
      try {
        // Спочатку перевіряємо кеш - може дані вже є і свіжі
        const cached = await getFromCache();

        if (cached) {
          // Кеш актуальний - беремо з нього, json-server не чіпаємо
          fastify.log.info('Category details served from cache');
          categoryDetails = cached;
        } else {
          // Кеш застарів або відсутній - йдемо до json-server
          // fetchWithRetry: до 3 спроб, timeout 5с, backoff 1с/2с/4с
          const response = await fetchWithRetry(
            'http://localhost:3001/categories/1',
            3,
            5000
          );
          categoryDetails = await response.json();

          // Зберігаємо у кеш на наступні 120 секунд
          await saveToCache(categoryDetails);
          fastify.log.info(
            'Category details fetched from json-server and cached'
          );
        }
      } catch (error) {
        // Graceful degradation: json-server недоступний після всіх спроб
        // Не падаємо з 500 - повертаємо продукт з categoryDetails: null
        fastify.log.warn(
          { err: error.message },
          'json-server unavailable, returning partial response'
        );
        categoryDetails = null;
      }

      // Крок 3: об'єднуємо дані і повертаємо
      return reply.send({
        ...product,
        image: buildImageUrl(request, product.image),
        categoryDetails,
      });
    }
  );

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

  // POST /api/products/:id/image - завантаження зображення
  fastify.post(
    /*
     перевіряє тип файлу (image/jpeg або image/png), 
     розмір до 5MB, створює папку uploads/{id}/, 
     зберігає через stream.pipe(writable) без завантаження в пам'ять, 
     оновлює продукт відносним шляхом, 
     повертає продукт з повним URL
    */
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

      // Перевіряємо тип файлу - тільки JPEG і PNG
      if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
        throw reply.badRequest('Дозволені тільки JPEG та PNG зображення');
      }

      // Визначаємо розширення файлу
      const ext = data.mimetype === 'image/jpeg' ? '.jpg' : '.png';

      // Створюємо директорію uploads/{id}/
      const uploadDir = path.join(process.cwd(), 'uploads', String(id));
      await fs.mkdir(uploadDir, { recursive: true });

      // Зберігаємо файл через stream - без завантаження в пам'ять
      const filePath = path.join(uploadDir, `image${ext}`);
      const writable = createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        data.file.pipe(writable);
        data.file.on('end', resolve);
        data.file.on('error', reject);
      });

      // Зберігаємо відносний шлях в файлі продукту
      // Відносний а не повний URL - бо домен може змінитись
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
