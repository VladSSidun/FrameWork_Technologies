// price-uah.transform.js — конвертує ціну з USD в UAH при експорті CSV
import { Transform } from 'stream';

export const createPriceTransform = (usdToUah) =>
  new Transform({
    // objectMode — працюємо з об'єктами а не рядками
    objectMode: true,
    transform(product, encoding, callback) {
      callback(null, {
        ...product,
        price: (product.price * usdToUah).toFixed(2),
        currency: 'UAH',
      });
    },
  });
