// це окрема v2 версія маршруту GET /products.
// products.route.js v2 - та ж колекція що і v1 але з пагінацією
// Замість повертати всі 12 продуктів одразу - ділимо на сторінки.

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
            page: { type: 'integer', minimum: 1, default: 1 },
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
      const page = request.query.page ?? 1; // Якщо там null або undefined
      const limit = request.query.limit ?? 10;

      const all = await productsService.findAll();
      const total = all.length;

      // Math.ceil бо остання сторінка може бути неповною
      const totalPages = Math.ceil(total / limit);

      // page=2, limit=3 → start=3, беремо items[3..5]
      const start = (page - 1) * limit;
      const data = all
        .slice(start, start + limit)
        .map((p) => ({ ...p, image: buildImageUrl(request, p.image) }));

      return reply.send({ data, meta: { total, page, limit, totalPages } });
    }
  );
}
