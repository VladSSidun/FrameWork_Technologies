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

export default async function productsRoutes(fastify) {
  // Реєструємо схему продукту для використання через $ref
  fastify.addSchema(productSchema);

  // GET /api/products — список всіх продуктів
  fastify.get(
    '/products',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: { $ref: 'Product#' }, // посилання на зареєстровану схему
          },
        },
      },
    },
    getAll
  );

  // GET /api/products/:id — один продукт
  fastify.get(
    '/products/:id',
    {
      schema: {
        params: idParam,
        response: {
          200: { $ref: 'Product#' },
        },
      },
    },
    getById
  );

  // POST /api/products — створити продукт
  fastify.post(
    '/products',
    {
      schema: {
        body: createProductBody, // Fastify валідує body автоматично
        response: {
          201: { $ref: 'Product#' },
        },
      },
    },
    create
  );

  // PATCH /api/products/:id — оновити продукт
  fastify.patch(
    '/products/:id',
    {
      schema: {
        params: idParam,
        body: updateProductBody,
        response: {
          200: { $ref: 'Product#' },
        },
      },
    },
    update
  );

  // DELETE /api/products/:id — видалити продукт (204 No Content)
  fastify.delete(
    '/products/:id',
    {
      schema: {
        params: idParam,
      },
    },
    remove
  );
}
