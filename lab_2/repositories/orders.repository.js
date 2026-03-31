// Repository для замовлень

let orders = [
  {
    id: 1,
    productId: 1,
    qty: 2,
    status: 'pending',
    totalPrice: 2599.98,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    productId: 2,
    qty: 1,
    status: 'delivered',
    totalPrice: 29.99,
    createdAt: '2026-01-16T12:00:00.000Z',
  },
];

let nextId = 3;

export const findAll = () => [...orders];

export const findById = (id) => orders.find((o) => o.id === id);

export const create = (data) => {
  const order = {
    id: nextId++,
    ...data,
    status: 'pending', // новий заказ завжди pending
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
};

export const update = (id, data) => {
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  orders[index] = { ...orders[index], ...data };
  return orders[index];
};

export const remove = (id) => {
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return false;

  orders.splice(index, 1);
  return true;
};
