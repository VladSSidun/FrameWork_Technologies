const Ajv = require('ajv');

const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    PORT: { type: 'string', pattern: '^[0-9]+$' },
    HOST: { type: 'string', minLength: 1 }, // ← HOSTNAME → HOST
    NODE_ENV: { type: 'string', enum: ['development', 'production'] },
  },
  required: ['PORT', 'HOST', 'NODE_ENV'], // ← HOSTNAME → HOST
  additionalProperties: true,
};

const validate = ajv.compile(schema);

module.exports = { validate };
