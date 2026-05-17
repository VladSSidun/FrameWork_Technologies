// products.controller.js
import { MESSAGES } from '#constants/messages.js';
import { eventBus } from '#events/event-bus.js';
import * as productsService from '#services/products.service.js';
import { buildImageUrl } from '#utils/image-url.js';

const withImageUrl = (request, product) => {
  if (!product) return null;
  return { ...product, image: buildImageUrl(request, product.image) };
};

export const getAll = async (request, reply) => {
  const products = await productsService.findAll();
  return reply.send(products.map((p) => withImageUrl(request, p)));
};

export const getById = async (request, reply) => {
  const product = await productsService.findById(request.params.id);
  if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);
  return reply.send(withImageUrl(request, product));
};

export const create = async (request, reply) => {
  const product = await productsService.create(request.body);
  // сповіщаємо всіх WebSocket клієнтів про новий продукт
  eventBus.emit('product:created', product);
  return reply.status(201).send(withImageUrl(request, product));
};

export const update = async (request, reply) => {
  const product = await productsService.update(request.params.id, request.body);
  if (!product) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);
  // сповіщаємо про оновлення
  eventBus.emit('product:updated', product);
  return reply.send(withImageUrl(request, product));
};

export const remove = async (request, reply) => {
  const success = await productsService.remove(request.params.id);
  if (!success) throw reply.notFound(MESSAGES.PRODUCT_NOT_FOUND);
  // сповіщаємо про видалення — передаємо тільки id
  eventBus.emit('product:deleted', request.params.id);
  return reply.status(204).send();
};
