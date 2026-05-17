// Service — бізнес-логіка.
// Repository не знає про правила бізнесу — це завдання service.
// Controller не знає як рахувати ціни — це завдання service.

// Service — бізнес-логіка.
// Repository не знає про правила бізнесу — це завдання service.
// Controller не знає як рахувати ціни — це завдання service.
import * as productsRepository from '#repositories/products.repository.js';

// Отримати всі продукти
export const findAll = () => productsRepository.findAll();

// Отримати продукт за id — повертає null якщо не знайдено
export const findById = async (id) => {
  const product = await productsRepository.findById(id);
  return product ?? null;
};

// Створити новий продукт
export const create = (data) => productsRepository.create(data);

// Оновити продукт
export const update = (id, data) => productsRepository.update(id, data);

// Видалити продукт
export const remove = (id) => productsRepository.remove(id);

// products.service.js — бізнес логіка, делегує до репозиторію
export const createProductsService = (repo) => ({
  findAll: () => repo.findAll(),
  findById: (id) => repo.findById(id),
  create: (data) => repo.create(data),
  update: (id, data) => repo.update(id, data),
  remove: (id) => repo.remove(id),
});
