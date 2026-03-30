// Варіант 1 — кожен лог є валідним JSON рядком
// Це дозволяє системам збору логів автоматично їх парсити

function log(level, fields) {
  const entry = {
    timestamp: new Date().toISOString(), // ISO 8601 — стандарт для логів
    level,
    ...fields, // розпаковуємо всі передані поля в об'єкт
  };
  // Помилки пишемо в stderr, решта в stdout
  // Це дозволяє розділити потоки: node app.js > logs.txt 2> errors.txt
  if (level === 'ERROR') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

function logRequest(method, url, status) {
  // Визначаємо рівень за статус-кодом
  let level = 'INFO';
  if (status >= 500) level = 'ERROR';
  else if (status >= 400) level = 'WARN';
  log(level, { method, url, status });
}

module.exports = { log, logRequest };
