// ws.route.js — WebSocket маршрут + підписка на події через EventEmitter
import { eventBus } from '#events/event-bus.js';

export default async function wsRoutes(fastify) {
  const clients = new Set();

  const broadcast = (message) => {
    const data = JSON.stringify(message);
    for (const client of clients) {
      // 1 = OPEN
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  };

  eventBus.on('product:created', (product) => {
    broadcast({ event: 'created', data: product });
  });

  eventBus.on('product:updated', (product) => {
    broadcast({ event: 'updated', data: product });
  });

  eventBus.on('product:deleted', (id) => {
    broadcast({ event: 'deleted', id });
  });

  fastify.get('/ws', { websocket: true }, (socket, request) => {
    clients.add(socket);
    fastify.log.info(`WebSocket client connected, total: ${clients.size}`);

    // при підключенні одразу надсилаємо поточний список
    import('#repositories/products.repository.js')
      .then(({ findAll }) => {
        findAll().then((products) => {
          socket.send(JSON.stringify({ event: 'init', data: products }));
        });
      })
      .catch((err) => {
        fastify.log.error(err, 'Failed to send initial data');
      });

    socket.on('close', () => {
      clients.delete(socket);
      fastify.log.info(`WebSocket client disconnected, total: ${clients.size}`);
    });

    socket.on('error', (err) => {
      fastify.log.error(err, 'WebSocket error');
      clients.delete(socket);
    });
  });
}
