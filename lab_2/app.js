// ─── Імпорти ──────────────────────────────────────────────────────────────────
const http = require("http"); // вбудований HTTP модуль Node.js
const config = require("./config"); // валідований конфіг
const {log, logRequest} = require("./logger"); //  логер

// ─── Момент старту (для підрахунку uptime у /health) ─────────────────────────
const startTime = Date.now();

// ─── Роутер — обробник усіх HTTP запитів ─────────────────────────────────────
function requestHandler(req, res) {
  const {method, url} = req;

  // Збираємо body запиту (для POST/PUT/PATCH)
  let body = "";
  req.on("data", (chunk) => {
    // data - подія надходження даних , chunck - шматок даних
    body += chunk;
  });

  req.on("end", () => {
    // Спочатку визначаємо відповідь, потім логуємо
    let statusCode = 200;
    let responseBody;

    // ── GET /health ──────────────────────────────────────────────────────────
    if (method === "GET" && url === "/health") {
      const memUsage = process.memoryUsage();
      responseBody = {
        pid: process.pid, // ID процесу в ОС
        nodeVersion: process.version, // наприклад "v20.11.0"
        platform: process.platform, // "linux", "win32", "darwin"
        uptime: Math.floor((Date.now() - startTime) / 1000), // секунди роботи
        memoryUsage: {
          // rss — скільки ОС виділила для процесу (RAM)
          rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
          // heapUsed — скільки JS-купи реально використовується
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
          // heapTotal — скільки JS-купи виділено всього
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        },
      };
      res.writeHead(statusCode, {"Content-Type": "application/json"});
      res.end(JSON.stringify(responseBody));

      // ── 404 для всіх інших маршрутів ─────────────────────────────────────────
    } else {
      statusCode = 404;
      responseBody = {error: "Not Found"};
      res.writeHead(statusCode, {"Content-Type": "application/json"});
      res.end(JSON.stringify(responseBody));
    }

    // ── Логування ─────────────────────────────────────────────────────────────
    // development → логуємо всі запити
    // production  → логуємо лише помилки (4xx, 5xx)
    if (config.NODE_ENV === "development" || statusCode >= 400) {
      logRequest(method, url, statusCode);
    }
  });
}

// ─── Створення HTTP сервера ───────────────────────────────────────────────────
const server = http.createServer(requestHandler);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
/**
 * Коректне завершення роботи сервера.
 * Чому не просто process.exit()?
 * Бо так ми ризикуємо:
 *   - обірвати активні HTTP з'єднання посередині відповіді
 *   - не записати незавершені логи
 *   - залишити відкриті ресурси (БД, файли)
 *
 * @param {string} signal - назва сигналу, що ініціював завершення
 */
function gracefulShutdown(signal) {
  log("INFO", {message: `Отримано сигнал ${signal}. Починаємо завершення...`});

  // Таймаут: якщо сервер не закрився за 10 секунд — вбиваємо примусово
  // Це захист від "зависання" при відкритих keep-alive з'єднаннях
  const forceExitTimer = setTimeout(() => {
    log("ERROR", {
      message: "Примусове завершення: сервер не закрився за 10 секунд",
    });
    process.exit(2); // Код 2 = примусове завершення по таймауту
  }, 10000);

  // unref() дозволяє Node.js не тримати event loop живим через цей таймер
  // Тобто якщо server.close() спрацює швидко — таймер не затримає вихід
  forceExitTimer.unref();

  // server.close() зупиняє прийом НОВИХ з'єднань,
  // але чекає завершення вже відкритих
  server.close((err) => {
    if (err) {
      log("ERROR", {message: `Помилка при закритті сервера: ${err.message}`});
      process.exit(1); // Код 1 = помилка
    }
    log("INFO", {message: "Сервер успішно закрито. До побачення!"});
    process.exit(0); // Код 0 = успіх
  });
}

// ─── Обробка сигналів ─────────────────────────────────────────────────────────
// SIGINT — Ctrl+C в терміналі
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// SIGTERM — від PM2, Docker, Kubernetes при зупинці контейнера
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ─── Глобальні обробники помилок ──────────────────────────────────────────────

// uncaughtException: виловлює синхронні помилки, що не потрапили в try/catch
// Після такої помилки стан процесу вважається непередбачуваним → завершуємо
process.on("uncaughtException", (err) => {
  log("ERROR", {
    message: "Необроблений виняток (uncaughtException)",
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown("uncaughtException");
});

// unhandledRejection: виловлює відхилені Promise без .catch()
process.on("unhandledRejection", (reason) => {
  log("ERROR", {
    message: "Необроблене відхилення промісу (unhandledRejection)",
    reason: reason instanceof Error ? reason.message : String(reason), //instanceof повертає true якщо обʼєкт є екземпляром вказаного класу
  });
  gracefulShutdown("unhandledRejection");
});

// ─── Запуск сервера ───────────────────────────────────────────────────────────
server.listen(config.PORT, config.HOSTNAME, () => {
  log("INFO", {
    message: `Сервер запущено`,
    host: config.HOSTNAME,
    port: config.PORT,
    env: config.NODE_ENV,
  });
});
