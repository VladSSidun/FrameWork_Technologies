const { logRequest } = require('../utils/logger');

// Зберігаємо момент старту для підрахунку uptime
const startTime = Date.now();

const getHealth = (req, res) => {
  // process.memoryUsage() — повертає об'єкт з використанням пам'яті в байтах
  const memUsage = process.memoryUsage();
  const responseBody = {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    memoryUsage: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(responseBody));
  logRequest(req.method, req.url, 200);
};

module.exports = { getHealth };
