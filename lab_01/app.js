const {createServer} = require("node:http");

// Масив зберігається лише в пам'яті
let INVENTORY = [{id: 1, name: "Monitor", price: 500, qty: 10}];

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";

const server = createServer((req, res) => {
  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // GET: Отримати всі товари. Фільтрація за ціною (?minPrice=100)
  if (method === "GET" && pathname === "/inventory") {
    const minPrice = parsedUrl.searchParams.get("minPrice");
    let results = [...INVENTORY];

    if (minPrice) {
      const priceFilter = parseFloat(minPrice);
      // Валідація: перевірка чи є параметр числом
      if (isNaN(priceFilter)) {
        res.statusCode = 400;
        return res.end(
          JSON.stringify({error: "Параметр minPrice повинен бути числом"}),
        );
      }
      results = results.filter((item) => item.price >= priceFilter);
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({count: results.length, items: results}));
  }

  // POST: Додати новий девайс
  if (method === "POST" && pathname === "/inventory") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        // Валідація вхідних даних
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

        const lastId =
          INVENTORY.length > 0 ? Math.max(...INVENTORY.map((i) => i.id)) : 0;
        const newItem = {
          id: lastId + 1,
          name: data.name,
          price: data.price,
          qty: data.qty,
        };

        INVENTORY.push(newItem);
        res.statusCode = 201;
        return res.end(JSON.stringify({message: "Created", item: newItem}));
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({error: "Невалідний JSON"}));
      }
    });
    return;
  }

  // PATCH: Оновлення по id
  if (method === "PATCH" && pathname.startsWith("/inventory/")) {
    const id = parseInt(pathname.split("/")[2]);
    if (isNaN(id)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({error: "Некоректний формат ID"}));
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const index = INVENTORY.findIndex((item) => item.id === id);
        if (index === -1) {
          res.statusCode = 404;
          return res.end(JSON.stringify({error: "Товар не знайдено"}));
        }

        const updates = JSON.parse(body);
        delete updates.id; // Заборона оновлення ID

        // Валідація типів, якщо поля передані
        if (updates.price !== undefined && typeof updates.price !== "number") {
          res.statusCode = 400;
          return res.end(JSON.stringify({error: "Price повинен бути числом"}));
        }
        if (updates.qty !== undefined && typeof updates.qty !== "number") {
          res.statusCode = 400;
          return res.end(JSON.stringify({error: "Qty повинен бути числом"}));
        }

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

  // DELETE: Видалити товар
  if (method === "DELETE" && pathname.startsWith("/inventory/")) {
    const id = parseInt(pathname.split("/")[2]);
    if (isNaN(id)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({error: "Некоректний формат ID"}));
    }

    const initialLength = INVENTORY.length;
    INVENTORY = INVENTORY.filter((item) => item.id !== id);

    if (INVENTORY.length < initialLength) {
      res.statusCode = 200;
      return res.end(JSON.stringify({message: "Deleted"}));
    } else {
      res.statusCode = 404;
      return res.end(JSON.stringify({error: "Товар не знайдено"}));
    }
  }

  // 404 Route Not Found
  res.statusCode = 404;
  res.end(JSON.stringify({error: "Маршрут не знайдено"}));
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});
