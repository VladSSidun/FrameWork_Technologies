// JSON Schema для замовлень

// Допустимі статуси замовлення — використовуємо в enum
const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export const orderSchema = {
  $id: 'Order',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    productId: { type: 'integer' },
    qty: { type: 'integer' },
    status: { type: 'string' },
    totalPrice: { type: 'number' },
    createdAt: { type: 'string' },
  },
};

// Body для створення замовлення
export const createOrderBody = {
  type: 'object',
  required: ['productId', 'qty'],
  properties: {
    productId: { type: 'integer', minimum: 1 },
    qty: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
};

// Body для зміни статусу замовлення
export const updateOrderBody = {
  type: 'object',
  required: ['status'],
  properties: {
    status: {
      type: 'string',
      enum: ORDER_STATUSES, // тільки дозволені статуси
    },
  },
  additionalProperties: false,
};

export const idParam = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
  },
};
