const Ajv = require('ajv');

const ajv = new Ajv();

// JSON Schema — описуємо яку структуру мають мати змінні середовища
const schema = {
  type: 'object',
  properties: {
    PORT: {
      type: 'string',
      pattern: '^[0-9]+$', // тільки цифри
    },
    HOST: {
      type: 'string',
      minLength: 1,
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production'], // тільки ці два значення
    },
  },
  required: ['PORT', 'HOST', 'NODE_ENV'],
  additionalProperties: true,
};

// ajv.compile() — компілює схему в оптимізовану функцію валідації
const validate = ajv.compile(schema);

module.exports = { validate };
