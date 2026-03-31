// JSON Schema для продуктів — використовується в маршрутах Fastify.
// Fastify автоматично валідує вхідні дані і серіалізує вихідні.
// Поля відсутні в response schema НЕ потраплять у відповідь (захист від витоку даних).

// Схема одного продукту — для повторного використання через $ref
export const productSchema = {
  $id: 'Product', // унікальний ідентифікатор — на нього будемо посилатись через $ref: 'Product#'
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    price: { type: 'number' },
    qty: { type: 'integer' },
    category: { type: 'string' },
  },
};

// Схема для body при створенні продукту (POST /api/products)
export const createProductBody = {
  type: 'object',
  required: ['name', 'price', 'qty'], // обовʼязкові поля
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 }, // ціна не може бути від'ємною
    qty: { type: 'integer', minimum: 0 }, // кількість не може бути від'ємною
    category: { type: 'string' },
  },
  additionalProperties: false, // зайві поля — 400 Bad Request
};

// Схема для body при оновленні продукту (PATCH /api/products/:id)
// required відсутній — можна передати лише ті поля які хочемо змінити
export const updateProductBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
    qty: { type: 'integer', minimum: 0 },
    category: { type: 'string' },
  },
  additionalProperties: false,
};

// Схема params для маршрутів з :id
export const idParam = {
  type: 'object',
  properties: {
    id: { type: 'integer' }, // Fastify автоматично конвертує рядок "1" → число 1
  },
};
