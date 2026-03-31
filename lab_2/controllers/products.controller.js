// Controller для продуктів.
// Отримує дані з request, передає до service, формує reply.
// НЕ містить бізнес-логіки — тільки "прийняв → делегував → відповів".

import { MESSAGES } from '#constants/messages.js';
import * as productsService from '#services/products.service.js';

// GET /api/products
export const getAll = async (request, reply) => {
  const products = productsService.findAll();
  return reply.send(products);
};

// GET /api/products/:id
export const getById = async (request, reply) => {
  const product = productsService.findById(request.params.id);

  // @fastify/sensible надає reply.notFound() — кидає 404 з JSON відповіддю
  if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

  return reply.send(product);
};

// POST /api/products
export const create = async (request, reply) => {
  const product = productsService.create(request.body);
  return reply.status(201).send(product); // 201 Created
};

// PATCH /api/products/:id
export const update = async (request, reply) => {
  const product = productsService.update(request.params.id, request.body);

  if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

  return reply.send(product);
};

// DELETE /api/products/:id
export const remove = async (request, reply) => {
  const success = productsService.remove(request.params.id);

  if (!success) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);

  return reply.status(204).send(); // 204 No Content — успішно видалено, тіло порожнє
};
