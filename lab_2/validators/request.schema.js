const Ajv = require('ajv');

const ajv = new Ajv();

const querySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' },
  },
  required: ['id'],
};

const bodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'number', minimum: 0 },
  },
  required: ['name', 'age'],
};

const validateQuery = ajv.compile(querySchema);
const validateBody = ajv.compile(bodySchema);

module.exports = { validateQuery, validateBody };
