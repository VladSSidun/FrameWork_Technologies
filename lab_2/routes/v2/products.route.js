// ── routes/v2/products.route.js ───────────────────────────
// v2 версія маршруту продуктів — додає підтримку пагінації
import * as productsService from '#services/products.service.js';
import { buildImageUrl } from '#utils/image-url.js';

export default async function productsRoutesV2(fastify) {
  // GET /api/v2/products?page=1&limit=10
  fastify.get(
    '/products',
    {
      schema: {
        description: 'Отримати продукти з пагінацією',
        tags: ['products'],
        querystring: {
          type: 'object',
          properties: {
            // page — яка сторінка (починаємо з 1)
            page: { type: 'integer', minimum: 1, default: 1 },
            // limit — скільки записів на сторінці
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    qty: { type: 'integer' },
                    category: { type: 'string' },
                    image: {},
                    discount: { type: 'integer' },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Читаємо параметри з query string, або використовуємо дефолти
      const page = request.query.page ?? 1;
      const limit = request.query.limit ?? 10;

      // Отримуємо всі продукти з файлової системи
      const all = await productsService.findAll();
      const total = all.length;

      // Рахуємо скільки всього сторінок
      // Math.ceil: 23 продукти / 10 = 2.3 → 3 сторінки
      const totalPages = Math.ceil(total / limit);

      // Вирізаємо потрібний шматок масиву
      // page=1: slice(0, 10) → перші 10
      // page=2: slice(10, 20) → наступні 10
      const start = (page - 1) * limit;
      const data = all.slice(start, start + limit).map((p) => ({
        ...p,
        image: buildImageUrl(request, p.image),
      }));

      return reply.send({
        data,
        meta: { total, page, limit, totalPages },
      });
    }
  );
}
