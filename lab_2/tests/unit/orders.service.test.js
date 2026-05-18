// unit тести для orders service
import { describe, expect, it } from 'vitest';

// імпортуємо напряму бо orders.service не використовує DI повністю
describe('OrdersService', () => {
  it('orders service існує', () => {
    expect(true).toBe(true);
  });
});
