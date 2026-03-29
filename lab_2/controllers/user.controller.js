const { validateQuery, validateBody } = require('../validators/request.schema');
const { logRequest } = require('../utils/logger');

const getUser = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams);

  const valid = validateQuery(query);
  if (!valid) {
    const error = validateQuery.errors[0].message;
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `query: ${error}` }));
    logRequest(req.method, req.url, 400);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ userId: query.id, name: 'Vlad' }));
  logRequest(req.method, req.url, 200);
};

const createUser = (req, res) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      logRequest(req.method, req.url, 400);
      return;
    }

    const valid = validateBody(body);
    if (!valid) {
      const error = validateBody.errors[0].message;
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `body: ${error}` }));
      logRequest(req.method, req.url, 400);
      return;
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User created', user: body }));
    logRequest(req.method, req.url, 201);
  });
};

module.exports = { getUser, createUser };
