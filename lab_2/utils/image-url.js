// Формує повний URL зображення з відносного шляху.
// В файлі зберігаємо відносний шлях: /1/image.jpg
// В відповіді повертаємо повний URL: http://localhost:3000/uploads/1/image.jpg
//
// Якщо домен зміниться — не треба оновлювати всі файли.
// Повний URL формуємо динамічно при кожному запиті.

export const buildImageUrl = (request, imagePath) => {
  if (!imagePath) return null;
  // request.hostname — тільки хост без порту
  // request.host — хост з портом (localhost:3000)
  return `${request.protocol}://${request.host}/uploads${imagePath}`;
};
