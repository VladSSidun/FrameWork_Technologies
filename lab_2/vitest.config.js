import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // всі тести в одному процесі, строго послідовно
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'services/**/*.js',
        'repositories/**/*.js',
        'utils/**/*.js',
        'controllers/**/*.js',
      ],
      exclude: [
        'utils/logger.js',
        'utils/fetch.utils.js',
        'utils/fs.utils.js',
        'utils/backup.utils.js',
        'utils/image-url.js',
        'src/scripts/**',
        'src/migrations/**',
        'controllers/orders.controller.js',
        'repositories/orders.repository.js',
        'services/orders.service.js',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
