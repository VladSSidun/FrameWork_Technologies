// Підключаємо вбудований модуль для читання .env файлу
// fs і path — стандартна бібліотека Node.js, npm не потрібен
const fs = require("fs");
const path = require("path");

// ─── Читання .env файлу вручну (без dotenv) ───────────────────────
// Завдання забороняє сторонні npm-пакети, тому парсимо .env самостійно.
// Шукаємо .env у тій самій директорії, де лежить цей файл.
const envPath = path.resolve(__dirname, ".env"); //будує абсолютний шлях до файлу .env
// __dirname — це вбудована змінна Node.js, яка містить абсолютний шлях до директорії поточного файлу

if (fs.existsSync(envPath)) {
  //перевіряє чи існує файл синхронно
  // Читаємо файл як текст, розбиваємо по рядках
  const lines = fs.readFileSync(envPath, "utf-8").split("\n"); //читає весь файл синхронно і повертає його вміст як рядок, потім кожен рядок робимо елементом масиву.

  for (const line of lines) {
    const trimmed = line.trim(); //.trim() — прибирає пробіли та \r
    // Пропускаємо порожні рядки та коментарі (# ...)
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Кожен рядок має вигляд KEY=VALUE
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();

    // Встановлюємо змінну лише якщо вона ще не задана ззовні
    // (щоб реальні системні змінні мали пріоритет над .env)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Валідація ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10); // кледемо 10 систему числення.
const HOSTNAME = process.env.HOSTNAME;
const NODE_ENV = process.env.NODE_ENV;

// Масив помилок — збираємо всі проблеми одразу, щоб показати їх разом
const errors = [];

// Перевірка PORT: має бути числом від 1 до 65535
if (!process.env.PORT) {
  errors.push("PORT не задано");
} else if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  errors.push(
    `PORT має бути числом від 1 до 65535, отримано: "${process.env.PORT}"`,
  );
}

// Перевірка HOSTNAME: має бути непорожнім рядком
if (!HOSTNAME || HOSTNAME.trim() === "") {
  errors.push("HOSTNAME не задано або порожнє");
}

// Перевірка NODE_ENV: лише два дозволені значення
const ALLOWED_ENVS = ["development", "production"];
if (!NODE_ENV) {
  errors.push("NODE_ENV не задано");
} else if (!ALLOWED_ENVS.includes(NODE_ENV)) {
  errors.push(
    `NODE_ENV має бути "development" або "production", отримано: "${NODE_ENV}"`,
  );
}

// Якщо є хоч одна помилка — виводимо всі і зупиняємо процес
if (errors.length > 0) {
  console.error("❌ Помилки конфігурації:");
  errors.forEach((e) => console.error(`   - ${e}`));
  console.error("Сервер не може бути запущений. Перевір файл .env");
  process.exit(1); // Код 1 = ненормальне завершення
}

// ─── Експорт валідованих значень ──────────────────────────────────────────────
// Тепер в app.js пишемо config.PORT замість process.env.PORT
module.exports = {
  PORT,
  HOSTNAME,
  NODE_ENV,
};
