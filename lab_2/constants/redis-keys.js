// redis-keys.js — всі ключі Redis в одному місці
// так легше відстежувати що зберігається і уникати помилок в рядках

export const REDIS_KEYS = {
  // кеш категорії для /products/:id/details
  categoryDetails: () => 'cache:category:details',

  // кеш пагінованого списку продуктів
  productsList: (page, limit) => `cache:products:list:${page}:${limit}`,

  // всі ключі кешу продуктів — для інвалідації при зміні даних
  productsListPattern: () => 'cache:products:list:*',
};
