// products.controller.js
import { MESSAGES } from '#constants/messages.js';
import { eventBus } from '#events/event-bus.js';
import { buildImageUrl } from '#utils/image-url.js';

const withImageUrl = (request, product) => {
  if (!product) return null;
  return { ...product, image: buildImageUrl(request, product.image) };
};

export const getAll = async (request, reply) => {
  // request.server — доступ до fastify інстансу з контролера
  const products = await request.server.productsService.findAll();
  return reply.send(products.map((p) => withImageUrl(request, p)));
};

export const getById = async (request, reply) => {
  const product = await request.server.productsService.findById(
    request.params.id
  );
  if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);
  return reply.send(withImageUrl(request, product));
};

export const create = async (request, reply) => {
  const product = await request.server.productsService.create(request.body);
  eventBus.emit('product:created', product);
  return reply.status(201).send(withImageUrl(request, product));
};

export const update = async (request, reply) => {
  const product = await request.server.productsService.update(
    request.params.id,
    request.body
  );
  if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);
  eventBus.emit('product:updated', product);
  return reply.send(withImageUrl(request, product));
};

export const remove = async (request, reply) => {
  const success = await request.server.productsService.remove(
    request.params.id
  );
  if (!success) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);
  eventBus.emit('product:deleted', request.params.id);
  return reply.status(204).send();
};
