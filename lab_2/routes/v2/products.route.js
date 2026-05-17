// products.route.js (v2) — з пагінацією та Redis кешем
import { buildImageUrl } from '#utils/image-url.js';

export default async function productsRoutesV2(fastify) {
  fastify.get(
    '/products',
    {
      schema: {
        description: 'Отримати продукти з пагінацією (з Redis кешем)',
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
      const page = request.query.page ?? 1;
      const limit = request.query.limit ?? 10;

      // findAllCached — перевіряє Redis перед зверненням до БД
      const all = await request.server.productsService.findAllCached(
        page,
        limit
      );
      const total = all.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const data = all
        .slice(start, start + limit)
        .map((p) => ({ ...p, image: buildImageUrl(request, p.image) }));

      return reply.send({ data, meta: { total, page, limit, totalPages } });
    }
  );
}
