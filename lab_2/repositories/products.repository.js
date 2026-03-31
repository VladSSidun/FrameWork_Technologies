// Repository — відповідає тільки за зберігання та отримання даних.
// Не містить бізнес-логіки — тільки CRUD операції над "базою даних".
// В лабораторній — масив в памʼяті замість реальної БД.

// "База даних" — масив продуктів, імітує таблицю/колекцію
let products = [
  {
    id: 1,
    name: 'Laptop Pro',
    price: 1299.99,
    qty: 10,
    category: 'electronics',
  },
  {
    id: 2,
    name: 'Wireless Mouse',
    price: 29.99,
    qty: 50,
    category: 'accessories',
  },
  { id: 3, name: 'USB-C Hub', price: 49.99, qty: 30, category: 'accessories' },
];

// Лічильник для генерації нових id (як AUTO_INCREMENT в SQL)
let nextId = 4;

// Повертає всі продукти
export const findAll = () => [...products]; // копія масиву щоб не можна було змінити ззовні

// Повертає продукт за id або undefined якщо не знайдено
export const findById = (id) => products.find((p) => p.id === id);

// Створює новий продукт і повертає його
export const create = (data) => {
  const product = { id: nextId++, ...data };
  products.push(product);
  return product;
};

// Оновлює продукт за id, повертає оновлений або null якщо не знайдено
export const update = (id, data) => {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  // Зберігаємо id і замінюємо тільки передані поля (partial update)
  products[index] = { ...products[index], ...data };
  return products[index];
};

// Видаляє продукт за id, повертає true якщо успішно
export const remove = (id) => {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;

  products.splice(index, 1);
  return true;
};
