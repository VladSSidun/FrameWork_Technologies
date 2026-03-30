// ─── Логер: кожен лог — валідний рядок JSON ───────────────────
//
// Приклад виводу:
// {"timestamp":"2023-10-25T14:30:00.000Z","level":"INFO","method":"GET","url":"/inventory","status":200}

/*
 * Основна функція логування.
 *  level  - рівень: 'INFO', 'WARN', 'ERROR'
 *  fields - довільні поля для включення в лог
 */
function log(level, fields) {
  const entry = {
    timestamp: new Date().toISOString(), // ISO 8601 — стандарт для логів
    level,
    ...fields, // розпаковуємо всі передані поля
  };

  // JSON.stringify перетворює об'єкт на рядок
  // Помилки (ERROR) пишемо в stderr, інше — в stdout
  if (level === "ERROR") {
    process.stderr.write(JSON.stringify(entry) + "\n"); // stringify перетворює обєкт JS на JSON
  } else {
    process.stdout.write(JSON.stringify(entry) + "\n");
  }
}

/*
 * Middleware для Express-подібних серверів або для ручного виклику.
 * Логує HTTP-запит після отримання відповіді.
 
 * @param {string} method - HTTP метод (GET, POST, ...)
 * @param {string} url    - шлях запиту (/health...)
 * @param {number} status - HTTP статус відповіді
 */
function logRequest(method, url, status) {
  // Визначаємо рівень за статус-кодом:
  // 5xx → ERROR, 4xx → WARN, решта → INFO
  let level = "INFO";
  if (status >= 500) level = "ERROR";
  else if (status >= 400) level = "WARN";

  log(level, {method, url, status});
}

module.exports = {log, logRequest};
