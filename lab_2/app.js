// ─── Імпорти ──────────────────────────────────────────────────────────────────
const http = require("http"); // вбудований HTTP модуль Node.js
const config = require("./config"); // валідований конфіг
const {log, logRequest} = require("./logger"); // логер

// Дані для Inventory — зберігаємо тільки в пам'яті, БД не використовуємо
let INVENTORY = [
  {id: 1, name: "Monitor", price: 500, qty: 10},
  {id: 2, name: "Keyboard", price: 100, qty: 25},
  {id: 3, name: "Mouse", price: 50, qty: 30},
];

// ─── Момент старту (для підрахунку uptime у /health) ─────────────────────────
const startTime = Date.now();

// ─── Допоміжна функція читання тіла запиту ───────────────────────────────────
// Повертає Promise бо body приходить потоком — частинами (chunks)
// resolve викликається коли всі дані зібрані і успішно розпарсені
// reject викликається якщо JSON невалідний
const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    // 'data' — подія яка спрацьовує кожного разу коли прийшов черговий шматок даних
    req.on("data", (chunk) => {
      raw += chunk.toString();
    });
    // 'end' — подія яка спрацьовує коли всі дані отримані
    req.on("end", () => {
      try {
        // JSON.parse — перетворює текстовий рядок у JS-об'єкт
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });

// ─── Роутер — обробник усіх HTTP запитів ─────────────────────────────────────
// async бо використовуємо await всередині для parseBody
async function requestHandler(req, res) {
  const {method} = req;

  // new URL — клас для безпечного парсингу адреси
  // req.url містить шлях запиту, req.headers.host — базовий домен
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // parsedUrl.pathname — чистий шлях без query параметрів (?minPrice=...)
  const pathname = parsedUrl.pathname;

  // Встановлюємо заголовок для всіх відповідей — клієнт знатиме що отримує JSON
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // ── GET /health ──────────────────────────────────────────────────────────────
  if (method === "GET" && pathname === "/health") {
    // process.memoryUsage() — повертає об'єкт з інформацією про використання пам'яті в байтах
    const memUsage = process.memoryUsage();
    const responseBody = {
      pid: process.pid, // ID процесу в ОС
      nodeVersion: process.version, // наприклад "v20.11.0"
      platform: process.platform, // "linux", "win32", "darwin"
      uptime: Math.floor((Date.now() - startTime) / 1000), // секунди роботи
      memoryUsage: {
        // ділимо на 1024*1024 щоб перевести байти в мегабайти
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      },
    };
    res.statusCode = 200;
    res.end(JSON.stringify(responseBody));
    logRequest(method, pathname, 200);
    return;
  }

  // ── GET /inventory?minPrice=100 ──────────────────────────────────────────────
  // Повертає всі товари, або відфільтровані за мінімальною ціною
  // http://localhost:3000/inventory
  // http://localhost:3000/inventory?minPrice=200
  if (method === "GET" && pathname === "/inventory") {
    // searchParams.get() — витягує значення query параметру з URL
    // якщо параметр відсутній — повертає null
    const minPrice = parsedUrl.searchParams.get("minPrice");

    if (minPrice !== null) {
      // parseFloat — перетворює рядок у число з плаваючою крапкою
      const priceFilter = parseFloat(minPrice);

      // isNaN — перевіряє чи є значення "не числом"
      if (isNaN(priceFilter)) {
        res.statusCode = 400;
        res.end(JSON.stringify({error: "minPrice має бути числом"}));
        logRequest(method, pathname, 400);
        return;
      }

      // .filter() — повертає новий масив тільки з елементами що пройшли умову
      const result = INVENTORY.filter((item) => item.price >= priceFilter);
      res.statusCode = 200;
      res.end(JSON.stringify({count: result.length, items: result}));
      logRequest(method, pathname, 200);
      return;
    }

    // Якщо фільтр не переданий — повертаємо весь масив
    res.statusCode = 200;
    res.end(JSON.stringify({count: INVENTORY.length, items: INVENTORY}));
    logRequest(method, pathname, 200);
    return;
  }

  // ── POST /inventory ──────────────────────────────────────────────────────────
  // Додає новий товар в масив INVENTORY
  if (method === "POST" && pathname === "/inventory") {
    let body;
    try {
      // await — чекаємо поки Promise з parseBody завершиться
      body = await parseBody(req);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "Невалідний JSON"}));
      logRequest(method, pathname, 400);
      return;
    }

    // Валідація обов'язкових полів — перевіряємо тип і наявність кожного поля
    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim() === ""
    ) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "name є обов'язковим рядком"}));
      logRequest(method, pathname, 400);
      return;
    }
    if (typeof body.price !== "number" || body.price < 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "price має бути числом >= 0"}));
      logRequest(method, pathname, 400);
      return;
    }
    if (typeof body.qty !== "number" || body.qty < 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "qty має бути числом >= 0"}));
      logRequest(method, pathname, 400);
      return;
    }

    // Math.max(...array.map()) — знаходимо найбільший id щоб наступний був унікальним
    // Якщо масив порожній — починаємо з 0, тоді наступний id буде 1
    const lastId =
      INVENTORY.length > 0 ? Math.max(...INVENTORY.map((i) => i.id)) : 0;

    const newItem = {
      id: lastId + 1,
      name: body.name,
      price: body.price,
      qty: body.qty,
    };

    // .push() — додає новий елемент у кінець масиву
    INVENTORY.push(newItem);
    res.statusCode = 201; // 201 Created — ресурс успішно створено
    res.end(JSON.stringify({message: "Created", item: newItem}));
    logRequest(method, pathname, 201);
    return;
  }

  // ── PATCH /inventory/:id ─────────────────────────────────────────────────────
  // Часткове оновлення товару — можна оновити одне або декілька полів крім id
  /*
  curl -X PATCH http://localhost:3000/inventory/1 \
    -H "Content-Type: application/json" \
    -d "{\"price\":450}"
  */

  if (method === "PATCH" && pathname.startsWith("/inventory/")) {
    // .split("/") — розбиває рядок "/inventory/2" на масив ["", "inventory", "2"]
    // [2] — беремо третій елемент, parseInt — перетворюємо рядок на число
    const id = parseInt(pathname.split("/")[2]);
    if (isNaN(id)) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "Некоректний формат ID"}));
      logRequest(method, pathname, 400);
      return;
    }

    let body;
    try {
      body = await parseBody(req);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "Невалідний JSON"}));
      logRequest(method, pathname, 400);
      return;
    }

    // delete — видаляємо поле id з body щоб клієнт не міг його змінити
    delete body.id;

    // Перевіряємо що передано хоча б одне поле для оновлення
    if (Object.keys(body).length === 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "Потрібно передати хоча б одне поле"}));
      logRequest(method, pathname, 400);
      return;
    }

    // Валідуємо тільки ті поля які були передані (перевірка !== undefined)
    if (
      body.name !== undefined &&
      (typeof body.name !== "string" || body.name.trim() === "")
    ) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "name має бути непорожнім рядком"}));
      logRequest(method, pathname, 400);
      return;
    }
    if (
      body.price !== undefined &&
      (typeof body.price !== "number" || body.price < 0)
    ) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "price має бути числом >= 0"}));
      logRequest(method, pathname, 400);
      return;
    }
    if (
      body.qty !== undefined &&
      (typeof body.qty !== "number" || body.qty < 0)
    ) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "qty має бути числом >= 0"}));
      logRequest(method, pathname, 400);
      return;
    }

    // .findIndex() — шукає індекс елемента в масиві, повертає -1 якщо не знайдено
    const index = INVENTORY.findIndex((item) => item.id === id);
    if (index === -1) {
      res.statusCode = 404; // 404 Not Found — товар не знайдено
      res.end(JSON.stringify({error: "Товар не знайдено"}));
      logRequest(method, pathname, 404);
      return;
    }

    // Синтаксис злиття об'єктів — спочатку розпаковуємо старі дані,
    // потім нові. Нові значення автоматично перезаписують старі
    INVENTORY[index] = {...INVENTORY[index], ...body};

    res.statusCode = 200;
    res.end(JSON.stringify({message: "Updated", item: INVENTORY[index]}));
    logRequest(method, pathname, 200);
    return;
  }

  // ── DELETE /inventory/:id ────────────────────────────────────────────────────
  // Видаляє товар з масиву за id
  // curl -X DELETE http://localhost:3000/inventory/2
  if (method === "DELETE" && pathname.startsWith("/inventory/")) {
    const id = parseInt(pathname.split("/")[2]);
    if (isNaN(id)) {
      res.statusCode = 400;
      res.end(JSON.stringify({error: "Некоректний формат ID"}));
      logRequest(method, pathname, 400);
      return;
    }

    // Зберігаємо початкову довжину щоб потім перевірити чи дійсно щось видалили
    const initialLength = INVENTORY.length;

    // .filter() — залишаємо тільки ті товари чий id НЕ дорівнює переданому
    INVENTORY = INVENTORY.filter((item) => item.id !== id);

    // Якщо довжина зменшилась — видалення відбулося успішно
    if (INVENTORY.length < initialLength) {
      res.statusCode = 200;
      res.end(JSON.stringify({message: "Deleted"}));
      logRequest(method, pathname, 200);
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({error: "Товар не знайдено"}));
      logRequest(method, pathname, 404);
    }
    return;
  }

  // ── 404 для всіх інших маршрутів ────────────────────────────────────────────
  res.statusCode = 404;
  res.end(JSON.stringify({error: "Маршрут не знайдено"}));
  logRequest(method, pathname, 404);
}

// ─── Створення HTTP сервера ───────────────────────────────────────────────────
const server = http.createServer(requestHandler);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// Коректне завершення роботи сервера при отриманні сигналу
// Якщо просто викликати process.exit() — активні з'єднання обірвуться
function gracefulShutdown(signal) {
  log("INFO", {message: `Отримано сигнал ${signal}. Починаємо завершення...`});

  // Таймаут 10 секунд — якщо сервер не закрився за цей час вбиваємо примусово
  // Це захист від "зависання" при відкритих keep-alive з'єднаннях
  const forceExitTimer = setTimeout(() => {
    log("ERROR", {
      message: "Примусове завершення: сервер не закрився за 10 секунд",
    });
    process.exit(2); // Код 2 = примусове завершення по таймауту
  }, 10000);

  // unref() — не тримати event loop живим тільки заради цього таймера
  // Якщо server.close() спрацює швидко — не чекатимемо 10 секунд
  forceExitTimer.unref();

  // server.close() — зупиняє прийом НОВИХ з'єднань
  // але чекає завершення вже відкритих запитів
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
// SIGINT — надсилається при натисканні Ctrl+C в терміналі
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// SIGTERM — надсилається від PM2, Docker, Kubernetes при зупинці контейнера
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ─── Глобальні обробники помилок ──────────────────────────────────────────────

// uncaughtException — виловлює синхронні помилки що не потрапили в try/catch
// Після такої помилки стан процесу вважається непередбачуваним → завершуємо
process.on("uncaughtException", (err) => {
  log("ERROR", {
    message: "Необроблений виняток (uncaughtException)",
    error: err.message,
    stack: err.stack,
  });
  gracefulShutdown("uncaughtException");
});

// unhandledRejection — виловлює відхилені Promise без .catch()
// Небезпечно бо помилка "губиться" і ми не знаємо що щось пішло не так
process.on("unhandledRejection", (reason) => {
  log("ERROR", {
    message: "Необроблене відхилення промісу (unhandledRejection)",
    // instanceof перевіряє чи є об'єкт екземпляром вказаного класу
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  gracefulShutdown("unhandledRejection");
});

// ─── Запуск сервера ───────────────────────────────────────────────────────────
// server.listen() — прив'язує сервер до порту і починає слухати вхідні з'єднання
// callback викликається один раз коли сервер успішно запущено
server.listen(config.PORT, config.HOSTNAME, () => {
  log("INFO", {
    message: "Сервер запущено",
    host: config.HOSTNAME,
    port: config.PORT,
    env: config.NODE_ENV,
  });
});
