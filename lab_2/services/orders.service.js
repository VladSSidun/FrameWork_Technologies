// Service для замовлень — тут вся бізнес-логіка:
// перевірка наявності продукту, розрахунок ціни тощо.

import * as ordersRepository from '#repositories/orders.repository.js';
import * as productsRepository from '#repositories/products.repository.js';

export const findAll = () => ordersRepository.findAll();

export const findById = (id) => ordersRepository.findById(id) ?? null;

// Створення замовлення — бізнес-логіка:
// 1. Перевіряємо чи існує продукт
// 2. Рахуємо загальну вартість
// 3. Зберігаємо замовлення
export const create = (data) => {
  const product = productsRepository.findById(data.productId);

  // Якщо продукт не знайдено — повертаємо null, controller кине 404
  if (!product) return null;

  const totalPrice = parseFloat((product.price * data.qty).toFixed(2));

  return ordersRepository.create({ ...data, totalPrice });
};

export const update = (id, data) => ordersRepository.update(id, data);

export const remove = (id) => ordersRepository.remove(id);
