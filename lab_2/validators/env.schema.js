import Ajv from 'ajv';

const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    PORT: {
      type: 'string',
      pattern: '^[0-9]+$',
    },
    HOSTNAME: {
      type: 'string',
      minLength: 1,
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production'],
    },
  },
  required: ['PORT', 'HOST', 'NODE_ENV'],
  additionalProperties: true,
};

const validate = ajv.compile(schema);

export { validate };
