const INVENTORY = require('../data/inventory');
const {
  validateCreate,
  validateUpdate,
  validateQuery,
} = require('../validators/inventory.schema');
const { logRequest } = require('../utils/logger');

// Допоміжна функція читання body — повертає Promise
// body приходить потоком тому збираємо частинами
const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });

// GET /inventory?minPrice=100
const getAll = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams);

  // AJV валідація query параметрів
  const validQuery = validateQuery(query);
  if (!validQuery) {
    const error = validateQuery.errors[0].message;
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `query: ${error}` }));
    logRequest(req.method, req.url, 400);
    return;
  }

  let result = [...INVENTORY];

  // Фільтруємо за мінімальною ціною якщо параметр переданий
  if (query.minPrice) {
    result = result.filter((item) => item.price >= Number(query.minPrice));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ count: result.length, items: result }));
  logRequest(req.method, req.url, 200);
};

// POST /inventory
const create = async (req, res) => {
  let body;
  try {
    body = await parseBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Невалідний JSON' }));
    logRequest(req.method, req.url, 400);
    return;
  }

  // AJV валідація body
  const valid = validateCreate(body);
  if (!valid) {
    const error = validateCreate.errors[0].message;
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `body: ${error}` }));
    logRequest(req.method, req.url, 400);
    return;
  }

  // Генеруємо унікальний id на основі максимального існуючого
  const lastId =
    INVENTORY.length > 0 ? Math.max(...INVENTORY.map((i) => i.id)) : 0;

  const newItem = {
    id: lastId + 1,
    name: body.name,
    price: body.price,
    qty: body.qty,
  };

  INVENTORY.push(newItem);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Created', item: newItem }));
  logRequest(req.method, req.url, 201);
};

// PATCH /inventory/:id
const update = async (req, res, id) => {
  let body;
  try {
    body = await parseBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Невалідний JSON' }));
    logRequest(req.method, req.url, 400);
    return;
  }

  // Забороняємо змінювати id
  delete body.id;

  // AJV валідація body
  const valid = validateUpdate(body);
  if (!valid) {
    const error = validateUpdate.errors[0].message;
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `body: ${error}` }));
    logRequest(req.method, req.url, 400);
    return;
  }

  // .findIndex() — шукає індекс елемента, повертає -1 якщо не знайдено
  const index = INVENTORY.findIndex((item) => item.id === id);
  if (index === -1) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Товар не знайдено' }));
    logRequest(req.method, req.url, 404);
    return;
  }

  // Злиття об'єктів — нові поля перезаписують старі
  INVENTORY[index] = { ...INVENTORY[index], ...body };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Updated', item: INVENTORY[index] }));
  logRequest(req.method, req.url, 200);
};

// DELETE /inventory/:id
const remove = (req, res, id) => {
  const index = INVENTORY.findIndex((item) => item.id === id);
  if (index === -1) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Товар не знайдено' }));
    logRequest(req.method, req.url, 404);
    return;
  }

  // splice() — видаляє елемент з масиву за індексом
  INVENTORY.splice(index, 1);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Deleted' }));
  logRequest(req.method, req.url, 200);
};

module.exports = { getAll, create, update, remove };
