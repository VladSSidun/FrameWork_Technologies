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
      'no-process-env': 'error',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
  {
    // CLI скрипти і утиліти — console дозволений
    files: ['src/**/*.js', 'utils/fs.utils.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
