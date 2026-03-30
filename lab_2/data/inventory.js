// Дані зберігаються тільки в пам'яті — БД не використовуємо
// let бо масив може змінюватись (DELETE перезаписує його)
let INVENTORY = [
  { id: 1, name: 'Monitor', price: 500, qty: 10 },
  { id: 2, name: 'Keyboard', price: 100, qty: 25 },
  { id: 3, name: 'Mouse', price: 50, qty: 30 },
];

module.exports = INVENTORY;
