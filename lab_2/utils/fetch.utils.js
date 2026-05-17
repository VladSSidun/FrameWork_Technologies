// fetch.utils.js - утиліти для запитів до зовнішніх сервісів

// якщо сервер не відповів за timeoutMs мілісекунд - скасовуємо запит
export const fetchWithTimeout = async (url, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs); // AbortController скасовує запит

  try {
    // signal - це мотузка між таймером і fetch, abort() її обриває
    return await fetch(url, { signal: controller.signal });
  } finally {
    // finally спрацює завжди - і при успіху і при помилці
    clearTimeout(timer);
  }
};

// повторює запит при невдачі, між спробами затримка збільшується вдвічі
export const fetchWithRetry = async (url, maxRetries = 3, timeoutMs = 5000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);

      // fetch не кидає помилку на 4xx/5xx - перевіряємо вручну
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries - 1) break;

      // 1000мс → 2000мс → 4000мс
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
