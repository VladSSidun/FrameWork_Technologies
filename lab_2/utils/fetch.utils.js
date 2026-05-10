// Утиліти для надійних HTTP запитів до зовнішніх сервісів

// fetchWithTimeout — робить fetch із жорстким обмеженням часу
// Якщо сервер не відповів за timeoutMs — запит скасовується
export const fetchWithTimeout = async (url, timeoutMs = 5000) => {
  // AbortController — вбудований механізм скасування async операцій
  const controller = new AbortController();

  // Через timeoutMs мілісекунд викликаємо abort() — це скасує fetch
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // signal передається у fetch — він "слухає" коли abort() буде викликано
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    // finally виконується завжди — і при успіху, і при помилці
    // Якщо відповідь прийшла вчасно — скасовуємо таймер щоб не було зайвого abort()
    clearTimeout(timer);
  }
};

// fetchWithRetry — повторює запит при невдачі (до maxRetries разів)
// Між спробами затримка збільшується вдвічі: 1с → 2с → 4с (exponential backoff)
export const fetchWithRetry = async (url, maxRetries = 3, timeoutMs = 5000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);

      // fetch не кидає помилку при 4xx/5xx — перевіряємо вручну
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Якщо це остання спроба — не чекаємо, одразу кидаємо помилку
      if (attempt === maxRetries - 1) break;

      // Exponential backoff: 1000мс, 2000мс, 4000мс
      // Math.pow(2, 0) = 1, Math.pow(2, 1) = 2, Math.pow(2, 2) = 4
      const delay = 1000 * Math.pow(2, attempt);

      // Чекаємо перед наступною спробою
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Всі спроби вичерпано — кидаємо останню помилку
  throw lastError;
};
