import { MESSAGES } from '#constants/messages.js';
import * as ordersService from '#services/orders.service.js';

export const getAll = async (request, reply) => {
  return reply.send(ordersService.findAll());
};

export const getById = async (request, reply) => {
  const order = ordersService.findById(request.params.id);
  if (!order) throw reply.notFound(MESSAGES.ORDER_NOT_FOUND);
  return reply.send(order);
};

export const create = async (request, reply) => {
  // service повертає null якщо продукт не існує
  const order = ordersService.create(request.body);
  if (!order) throw reply.badRequest('Продукт з таким productId не існує');
  return reply.status(201).send(order);
};

export const update = async (request, reply) => {
  const order = ordersService.update(request.params.id, request.body);
  if (!order) throw reply.notFound(MESSAGES.ORDER_NOT_FOUND);
  return reply.send(order);
};

export const remove = async (request, reply) => {
  const success = ordersService.remove(request.params.id);
  if (!success) throw reply.notFound(MESSAGES.ORDER_NOT_FOUND);
  return reply.status(204).send();
};
