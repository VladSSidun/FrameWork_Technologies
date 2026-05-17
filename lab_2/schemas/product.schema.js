export const productSchema = {
  $id: 'Product',
  type: 'object',
  properties: {
    id: { type: 'string' }, // MongoDB ObjectId — рядок, не integer
    name: { type: 'string' },
    price: { type: 'number' },
    qty: { type: 'integer' },
    category: { type: 'string' },
    image: {},
    discount: { type: 'integer' },
  },
};

export const createProductBody = {
  type: 'object',
  required: ['name', 'price', 'qty'],
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
    qty: { type: 'integer', minimum: 0 },
    category: { type: 'string' },
    image: { nullable: true, type: 'string' },
  },
  additionalProperties: false,
};

export const updateProductBody = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
    qty: { type: 'integer', minimum: 0 },
    category: { type: 'string' },
    image: { nullable: true, type: 'string' },
  },
  additionalProperties: false,
};

// id тепер string — MongoDB ObjectId
export const idParam = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
};
