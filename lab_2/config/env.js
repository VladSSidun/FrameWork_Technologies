const fs = require('fs');
const path = require('path');
const { validate } = require('../validators/env.schema');

// Читаємо .env файл вручну без dotenv
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    // Не перезаписуємо якщо змінна вже задана системою
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// AJV валідація — якщо щось не так сервер не запуститься
const valid = validate(process.env);
if (!valid) {
  console.error('Помилки конфігурації:');
  validate.errors.forEach((e) => {
    console.error(`  - ${e.instancePath} ${e.message}`);
  });
  process.exit(1);
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10),
  HOSTNAME: process.env.HOST, // читаємо HOST щоб не конфліктувати з системною HOSTNAME
  NODE_ENV: process.env.NODE_ENV,
};
