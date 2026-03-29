import { validate } from '#validators/env.schema.js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(import.meta.dirname, '../.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const valid = validate(process.env);
if (!valid) {
  console.error('Помилки конфігурації:');
  validate.errors.forEach((e) => {
    console.error(`  - ${e.instancePath} ${e.message}`);
  });
  process.exit(1);
}

export default {
  PORT: parseInt(process.env.PORT, 10),
  HOSTNAME: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV,
};
