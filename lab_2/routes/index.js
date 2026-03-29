const { getHealth } = require('#controllers/health.controller');

function router(req, res, config) {
  const { method, url } = req;

  if (method === 'GET' && url === '/health') {
    return getHealth(req, res, config);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));

  const { logRequest } = require('#utils/logger');
  logRequest(method, url, 404);
}

module.exports = { router };
