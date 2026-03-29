const { getHealth } = require('#controllers/health.controller');
const { getUser, createUser } = require('#controllers/user.controller');
const { logRequest } = require('#utils/logger');

function router(req, res) {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/health') {
    return getHealth(req, res);
  }

  if (method === 'GET' && pathname === '/user') {
    return getUser(req, res);
  }

  if (method === 'POST' && pathname === '/user') {
    return createUser(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
  logRequest(method, req.url, 404);
}

module.exports = { router };
// ```

// ---

// ## Що відбувається в кожному запиті
// ```
// GET /user?id=1
//   → витягуємо { id: '1' } з URL
//   → AJV перевіряє що id є рядком з цифр
//   → якщо ок → 200 { userId: '1', name: 'Vlad' }
//   → якщо ні → 400 { error: 'query: ...' }

// POST /user з { name: 'Vlad', age: 20 }
//   → читаємо тіло запиту
//   → парсимо JSON
//   → AJV перевіряє що name це рядок і age це число
//   → якщо ок → 201 { message: 'User created', user: {...} }
//   → якщо ні → 400 { error: 'body: ...' }
