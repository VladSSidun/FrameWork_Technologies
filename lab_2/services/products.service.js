// Service — бізнес-логіка.
// Repository не знає про правила бізнесу — це завдання service.
// Controller не знає як рахувати ціни — це завдання service.

import * as productsRepository from '#repositories/products.repository.js';

// Отримати всі продукти (тут можна додати фільтрацію, сортування тощо)
export const findAll = () => productsRepository.findAll();

// Отримати продукт за id — повертає null якщо не знайдено
export const findById = (id) => productsRepository.findById(id) ?? null;

// Створити новий продукт
export const create = (data) => productsRepository.create(data);

// Оновити продукт
export const update = (id, data) => productsRepository.update(id, data);

// Видалити продукт
export const remove = (id) => productsRepository.remove(id);
