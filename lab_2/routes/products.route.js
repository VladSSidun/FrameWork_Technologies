// products.route.js
import { MESSAGES } from '#constants/messages.js';
import { REDIS_KEYS } from '#constants/redis-keys.js';
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
import { createPriceTransform } from '#transforms/price-uah.transform.js';
import { fetchWithRetry } from '#utils/fetch.utils.js';
import { buildImageUrl } from '#utils/image-url.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export default async function productsRoutes(fastify) {
  fastify.addSchema(productSchema);

  fastify.get('/products/export', async (request, reply) => {
    const products = await request.server.productsService.findAll();
    const useTransform = request.query.transform === 'true';

    if (useTransform) {
      const usdToUah = fastify.config.USD_TO_UAH;
      const priceTransform = createPriceTransform(usdToUah);
      const stringifier = stringify({ header: true });

      reply
        .header('Content-Type', 'text/csv')
        .header(
          'Content-Disposition',
          'attachment; filename="products-uah.csv"'
        );

      await pipeline(
        Readable.from(products),
        priceTransform,
        stringifier,
        reply.raw
      );
      return;
    }

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

  fastify.post('/products/import', async (request, reply) => {
    const data = await request.file();
    if (!data) throw reply.badRequest('Файл не завантажено');

    const isJson =
      data.mimetype === 'application/json' || data.filename.endsWith('.json');
    const isCsv =
      data.mimetype === 'text/csv' || data.filename.endsWith('.csv');

    if (!isJson && !isCsv)
      throw reply.badRequest('Підтримуються тільки CSV та JSON формати');

    const buffer = await data.toBuffer();
    let items;

    if (isJson) {
      items = JSON.parse(buffer.toString());
    } else {
      items = parse(buffer, { columns: true, skip_empty_lines: true });
    }

    if (!Array.isArray(items))
      throw reply.badRequest('Файл має містити масив записів');

    let imported = 0;
    const rejected = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

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

      await request.server.productsService.create({
        name: item.name.toString().trim(),
        price,
        qty,
        category: item.category?.toString().trim() || '',
      });

      imported++;
    }

    return reply.send({
      imported,
      rejected: rejected.length,
      details: rejected,
    });
  });

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
      const product = await request.server.productsService.findById(id);
      if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

      let categoryDetails = null;
      const cacheKey = REDIS_KEYS.categoryDetails();

      try {
        // перевіряємо Redis кеш
        const cached = await request.server.cacheUtils.getFromCache(cacheKey);

        if (cached) {
          fastify.log.info('Category details served from Redis cache');
          categoryDetails = cached;
        } else {
          const response = await fetchWithRetry(
            'http://localhost:3001/categories/1',
            3,
            5000
          );
          categoryDetails = await response.json();
          await request.server.cacheUtils.saveToCache(
            cacheKey,
            categoryDetails,
            120
          );
          fastify.log.info('Category details fetched and cached in Redis');
        }
      } catch (error) {
        fastify.log.warn(
          { err: error.message },
          'json-server unavailable, returning partial response'
        );
        categoryDetails = null;
      }

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
        response: { 200: { type: 'array', items: { $ref: 'Product#' } } },
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

  fastify.post(
    '/products/:id/image',
    {
      schema: { params: idParam },
    },
    async (request, reply) => {
      const { id } = request.params;
      const product = await request.server.productsService.findById(id);
      if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

      const data = await request.file();
      if (!data) throw reply.badRequest('Зображення не завантажено');

      if (!['image/jpeg', 'image/png'].includes(data.mimetype)) {
        throw reply.badRequest('Дозволені тільки JPEG та PNG зображення');
      }

      const ext = data.mimetype === 'image/jpeg' ? '.jpg' : '.png';
      const uploadDir = path.join(process.cwd(), 'uploads', String(id));
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, `image${ext}`);
      const writable = createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        data.file.pipe(writable);
        data.file.on('end', resolve);
        data.file.on('error', reject);
      });

      const imagePath = `/${id}/image${ext}`;
      const updated = await request.server.productsService.update(id, {
        image: imagePath,
      });

      return reply.send({
        ...updated,
        image: buildImageUrl(request, imagePath),
      });
    }
  );
}
