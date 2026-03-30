const Ajv = require('ajv');

const ajv = new Ajv();

// Схема для POST — всі поля обов'язкові
const createSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
    qty: { type: 'number', minimum: 0 },
  },
  required: ['name', 'price', 'qty'],
  additionalProperties: false, // забороняємо зайві поля
};

// Схема для PATCH — всі поля опціональні але хоча б одне обов'язкове
const updateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
    qty: { type: 'number', minimum: 0 },
  },
  additionalProperties: false,
  minProperties: 1, // хоча б одне поле
};

// Схема для query параметрів GET /inventory?minPrice=100
const querySchema = {
  type: 'object',
  properties: {
    minPrice: { type: 'string', pattern: '^[0-9]+(\\.[0-9]+)?$' },
  },
  additionalProperties: false,
};

const validateCreate = ajv.compile(createSchema);
const validateUpdate = ajv.compile(updateSchema);
const validateQuery = ajv.compile(querySchema);

module.exports = { validateCreate, validateUpdate, validateQuery };
