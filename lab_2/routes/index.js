import { getHealth } from '#controllers/health.controller.js';
import { logRequest } from '#utils/logger.js';

function router(req, res) {
  const { method, url } = req;

  if (method === 'GET' && url === '/health') {
    return getHealth(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
  logRequest(method, url, 404);
}

export { router };
