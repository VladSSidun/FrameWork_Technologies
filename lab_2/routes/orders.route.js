import {
  create,
  getAll,
  getById,
  remove,
  update,
} from '#controllers/orders.controller.js';
import {
  createOrderBody,
  idParam,
  orderSchema,
  updateOrderBody,
} from '#schemas/order.schema.js';

export default async function ordersRoutes(fastify) {
  fastify.addSchema(orderSchema);

  fastify.get(
    '/orders',
    {
      schema: {
        response: { 200: { type: 'array', items: { $ref: 'Order#' } } },
      },
    },
    getAll
  );

  fastify.get(
    '/orders/:id',
    {
      schema: {
        params: idParam,
        response: { 200: { $ref: 'Order#' } },
      },
    },
    getById
  );

  fastify.post(
    '/orders',
    {
      schema: {
        body: createOrderBody,
        response: { 201: { $ref: 'Order#' } },
      },
    },
    create
  );

  fastify.patch(
    '/orders/:id',
    {
      schema: {
        params: idParam,
        body: updateOrderBody,
        response: { 200: { $ref: 'Order#' } },
      },
    },
    update
  );

  fastify.delete(
    '/orders/:id',
    {
      schema: { params: idParam },
    },
    remove
  );
}
