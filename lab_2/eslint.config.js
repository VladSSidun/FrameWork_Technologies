import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Забороняємо process.env в коді — тільки через fastify.config
      // Порушення = помилка лінтера (error), а не попередження
      'no-process-env': 'error',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
];
