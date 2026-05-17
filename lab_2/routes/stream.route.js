// stream.route.js — потоковий експорт та бекапи
import { buildImageUrl } from '#utils/image-url.js';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

const DATA_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export default async function streamRoutes(fastify) {
  // GET /api/v1/products/stream — віддає всі продукти по одному в форматі NDJSON
  // кожен запис відправляється одразу після читання файлу
  fastify.get(
    '/products/stream',
    {
      schema: {
        description: 'Потоковий список продуктів у форматі NDJSON',
        tags: ['products'],
      },
    },
    async (request, reply) => {
      let files;
      try {
        files = await fs.readdir(DATA_DIR);
      } catch {
        return reply.send([]);
      }

      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      // Transform який читає файл і перетворює на NDJSON рядок
      const toNDJSON = new Transform({
        objectMode: true,
        transform(product, encoding, callback) {
          // кожен об'єкт → JSON рядок + перенос рядка
          callback(
            null,
            JSON.stringify({
              ...product,
              image: buildImageUrl(request, product.image),
            }) + '\n'
          );
        },
      });

      // Readable який по черзі читає кожен файл продукту
      async function* readProducts() {
        for (const file of jsonFiles) {
          const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          yield JSON.parse(content);
        }
      }

      reply.type('application/x-ndjson');

      // pipeline: генератор файлів → NDJSON трансформер → HTTP відповідь
      await pipeline(
        Readable.from(readProducts()),
        toNDJSON,
        reply.raw // reply.raw — це нативний http.ServerResponse (Writable stream)
      );
    }
  );

  // GET /api/v1/backups/:timestamp — віддає бекап файл потоково
  // захищений api ключем
  fastify.get(
    '/backups/:timestamp',
    {
      schema: {
        description: 'Отримати бекап файл',
        tags: ['backups'],
        params: {
          type: 'object',
          properties: { timestamp: { type: 'string' } },
        },
      },
      onRequest: async (request, reply) => {
        const apiKey = request.headers['x-api-key'];
        if (!apiKey || apiKey !== fastify.config.ADMIN_API_KEY) {
          throw reply.unauthorized('Невірний або відсутній x-api-key');
        }
      },
    },
    async (request, reply) => {
      const { timestamp } = request.params;
      const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

      try {
        await fs.access(backupPath);
      } catch {
        throw reply.notFound('Бекап не знайдено');
      }

      // віддаємо стиснений файл потоково — не завантажуємо в пам'ять
      reply.header(
        'Content-Disposition',
        `attachment; filename="${timestamp}.gz"`
      );
      reply.type('application/gzip');

      await pipeline(createReadStream(backupPath), reply.raw);
    }
  );
}
