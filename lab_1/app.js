/* ==========================================================================
   КОНСПЕКТ: ВБУДОВАНІ МЕТОДИ ТА АБСТРАКЦІЇ NODE.JS
   ========================================================================== */

// require() — це вбудована функція Node.js (система модулів CommonJS) для імпорту коду.
// "node:http" — це базовий модуль, який містить класи та методи для роботи з HTTP-протоколом.
const {createServer} = require("node:http");

let INVENTORY = [{id: 1, name: "Monitor", price: 500, qty: 10}];

// process — це глобальний об'єкт Node.js, який надає інформацію про поточний процес виконання.
// process.env — це властивість, яка містить усі змінні середовища (зчитані з файлу .env).
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";

/* * createServer() — метод модуля http. Створює та повертає об'єкт сервера.
 * Він приймає callback-функцію, яка автоматично викликається при кожному вхідному запиті.
 * * req (IncomingMessage) — об'єкт вхідного запиту. Містить дані ВІД клієнта.
 * res (ServerResponse) — об'єкт вихідної відповіді. Формує дані ДЛЯ клієнта.
 */
const server = createServer((req, res) => {
  // req.method — властивість, що містить тип HTTP-запиту у вигляді рядка ('GET', 'POST', тощо).
  const method = req.method;

  /* * new URL(input, base) — глобальний клас для безпечного парсингу веб-адрес.
   * req.url — містить шлях запиту (наприклад, '/inventory?minPrice=100').
   * req.headers.host — містить базовий домен (наприклад, 'localhost:3000'),
   * який ми дістаємо із заголовків (headers) вхідного запиту.
   */
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // parsedUrl.pathname — витягує лише чистий шлях, відкидаючи параметри (поверне '/inventory').
  const pathname = parsedUrl.pathname;

  /* * res.setHeader(name, value) — метод об'єкта відповіді.
   * Задає HTTP-заголовки, які підказують браузеру або клієнту (Thunder Client),
   * який тип даних ми йому повертаємо. Тут ми вказуємо, що це буде JSON у кодуванні UTF-8.
   */
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  /* ==========================================
     1. GET: ОТРИМАННЯ ДАНИХ ТА ФІЛЬТРАЦІЯ
     ========================================== */
  if (method === "GET" && pathname === "/inventory") {
    // parsedUrl.searchParams.get(name) — метод для витягування значень параметрів запиту.
    // Якщо URL закінчується на ?minPrice=100, метод поверне рядок "100".
    const minPrice = parsedUrl.searchParams.get("minPrice");

    // Спред-оператор (...) — розпаковує елементи старого масиву INVENTORY у новий масив results.
    let results = [...INVENTORY];

    if (minPrice) {
      // parseFloat() — стандартна функція JS, яка намагається перетворити рядок у число.
      const priceFilter = parseFloat(minPrice);

      // isNaN() — функція перевірки "Is Not a Number". Повертає true, якщо конвертація не вдалася.
      if (isNaN(priceFilter)) {
        // res.statusCode — властивість, що задає числовий HTTP-статус відповіді (400 - помилка клієнта).
        res.statusCode = 400;

        /* * res.end(data) — КРИТИЧНИЙ МЕТОД.
         * 1. Він сигналізує серверу, що ми закінчили формувати відповідь.
         * 2. Відправляє передані дані (payload) клієнту і закриває з'єднання.
         * Якщо забути викликати res.end(), запит клієнта буде "висіти" і чекати нескінченно.
         * * JSON.stringify(obj) — перетворює JavaScript-об'єкт у текстовий рядок JSON формату.
         * Це обов'язково, бо HTTP-протокол може передавати лише текст або бінарні дані, а не JS-об'єкти.
         */
        return res.end(
          JSON.stringify({error: "Параметр minPrice повинен бути числом"}),
        );
      }

      // .filter() — метод масиву, який створює новий масив з усіма елементами, що пройшли перевірку.
      results = results.filter((item) => item.price >= priceFilter);
    }

    res.statusCode = 200; // 200 OK - запит успішний.
    return res.end(JSON.stringify({count: results.length, items: results}));
  }

  /* ==========================================
     2. POST: ДОДАВАННЯ НОВОГО ТОВАРУ
     ========================================== */
  if (method === "POST" && pathname === "/inventory") {
    let body = "";

    /* * req.on(eventName, listener) — метод для прослуховування подій.
     * Оскільки Node.js обробляє дані потоками (Streams), вони надходять частинами (chunks).
     * Подія 'data' спрацьовує щоразу, коли приходить нова порція інформації.
     * chunk.toString() — перетворює отримані бінарні дані (Buffer) у зрозумілий текст.
     */
    req.on("data", (chunk) => (body += chunk.toString()));

    // Подія 'end' спрацьовує один раз, коли всі шматки даних успішно завантажені на сервер.
    req.on("end", () => {
      // try...catch — блок перехоплення помилок. Якщо код всередині try "впаде",
      // виконання перейде у catch, не дозволяючи всьому серверу крашнутися.
      try {
        // JSON.parse(string) — робить зворотну дію до stringify. Перетворює текст у JS-об'єкт.
        const data = JSON.parse(body);

        if (
          !data.name ||
          typeof data.price !== "number" ||
          typeof data.qty !== "number"
        ) {
          res.statusCode = 400;
          return res.end(
            JSON.stringify({
              error:
                "Поля name (рядок), price (число) та qty (число) є обов'язковими.",
            }),
          );
        }

        /*
         * .map() — створює новий масив результатів виклику функції для кожного елемента (тут отримуємо масив усіх ID).
         * Math.max() — знаходить найбільше число серед переданих аргументів.
         * Якщо масив порожній, ставимо 0, щоб наступний ID став 1.
         */
        const lastId =
          INVENTORY.length > 0 ? Math.max(...INVENTORY.map((i) => i.id)) : 0;

        const newItem = {
          id: lastId + 1,
          name: data.name,
          price: data.price,
          qty: data.qty,
        };

        // .push() — додає новий елемент у кінець існуючого масиву.
        INVENTORY.push(newItem);
        res.statusCode = 201; // 201 Created - ресурс успішно створено.
        return res.end(JSON.stringify({message: "Created", item: newItem}));
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({error: "Невалідний JSON"}));
      }
    });
    return;
  }

  /* ==========================================
     3. PATCH: ЧАСТКОВЕ ОНОВЛЕННЯ ТОВАРУ
     ========================================== */
  // .startsWith(searchString) — метод рядка, перевіряє, чи починається URL із вказаного фрагмента.
  if (method === "PATCH" && pathname.startsWith("/inventory/")) {
    /*
     * .split("/") — розбиває рядок "/inventory/2" на масив за вказаним роздільником: ["", "inventory", "2"].
     * [2] — беремо третій елемент масиву (це рядок "2").
     * parseInt() — перетворює рядок на ціле число.
     */
    const id = parseInt(pathname.split("/")[2]);
    if (isNaN(id)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({error: "Некоректний формат ID"}));
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        // .findIndex() — шукає індекс першого елемента в масиві, який відповідає умові.
        // Якщо такого елемента немає, метод завжди повертає -1.
        const index = INVENTORY.findIndex((item) => item.id === id);
        if (index === -1) {
          res.statusCode = 404; // 404 Not Found - ресурс не знайдено.
          return res.end(JSON.stringify({error: "Товар не знайдено"}));
        }

        const updates = JSON.parse(body);

        // оператор delete — видаляє вказану властивість з об'єкта.
        // Ми це робимо, щоб клієнт не міг випадково або навмисно змінити ID товару.
        delete updates.id;

        // !== undefined — перевіряє, чи було взагалі передане це поле в тілі запиту.
        if (updates.price !== undefined && typeof updates.price !== "number") {
          res.statusCode = 400;
          return res.end(JSON.stringify({error: "Price повинен бути числом"}));
        }
        if (updates.qty !== undefined && typeof updates.qty !== "number") {
          res.statusCode = 400;
          return res.end(JSON.stringify({error: "Qty повинен бути числом"}));
        }

        // Синтаксис злиття об'єктів. Спочатку розпаковуємо старі дані товару,
        // а потім зверху розпаковуємо нові. Нові значення автоматично перезаписують старі.
        INVENTORY[index] = {...INVENTORY[index], ...updates};

        res.statusCode = 200;
        return res.end(
          JSON.stringify({message: "Updated", item: INVENTORY[index]}),
        );
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({error: "Невалідний JSON"}));
      }
    });
    return;
  }

  /* ==========================================
     4. DELETE: ВИДАЛЕННЯ ТОВАРУ
     ========================================== */
  if (method === "DELETE" && pathname.startsWith("/inventory/")) {
    const id = parseInt(pathname.split("/")[2]);
    if (isNaN(id)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({error: "Некоректний формат ID"}));
    }

    // Зберігаємо початкову довжину масиву, щоб потім порівняти.
    const initialLength = INVENTORY.length;

    // Перезаписуємо масив INVENTORY. Залишаємо ТІЛЬКИ ті товари, чий id НЕ дорівнює переданому.
    INVENTORY = INVENTORY.filter((item) => item.id !== id);

    // Якщо поточна довжина стала меншою за початкову, отже видалення дійсно відбулося.
    if (INVENTORY.length < initialLength) {
      res.statusCode = 200;
      return res.end(JSON.stringify({message: "Deleted"}));
    } else {
      res.statusCode = 404;
      return res.end(JSON.stringify({error: "Товар не знайдено"}));
    }
  }

  /* ==========================================
     5. FALLBACK (Якщо жоден маршрут не підійшов)
     ========================================== */
  res.statusCode = 404;
  res.end(JSON.stringify({error: "Маршрут не знайдено"}));
});

/* * server.listen(port, hostname, callback) — метод, що змушує сервер почати роботу.
 * Він прив'язує сервер до конкретного порту і мережевого інтерфейсу,
 * після чого починає нескінченно слухати вхідні з'єднання.
 * Callback-функція виконується один раз, коли сервер успішно запущено.
 */
server.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});
