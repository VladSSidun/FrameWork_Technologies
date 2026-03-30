const { getHealth } = require('#controllers/health.controller');
const {
  getAll,
  create,
  update,
  remove,
} = require('#controllers/inventory.controller');
const { logRequest } = require('#utils/logger');

function router(req, res) {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // http://localhost:3000/
  // ── GET /health ─────────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/health') {
    return getHealth(req, res);
  }

  // ── GET /inventory ──────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/inventory') {
    return getAll(req, res);
  }

  // ── POST /inventory ─────────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/inventory') {
    return create(req, res);
  }

  // ── PATCH /inventory/:id ────────────────────────────────────────────────────
  if (method === 'PATCH' && pathname.startsWith('/inventory/')) {
    const id = parseInt(pathname.split('/')[2]);
    if (isNaN(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Некоректний формат ID' }));
      logRequest(method, req.url, 400);
      return;
    }
    return update(req, res, id);
  }

  // ── DELETE /inventory/:id ───────────────────────────────────────────────────
  if (method === 'DELETE' && pathname.startsWith('/inventory/')) {
    const id = parseInt(pathname.split('/')[2]);
    if (isNaN(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Некоректний формат ID' }));
      logRequest(method, req.url, 400);
      return;
    }
    return remove(req, res, id);
  }

  // ── 404 ─────────────────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Маршрут не знайдено' }));
  logRequest(method, req.url, 404);
}

module.exports = { router };
