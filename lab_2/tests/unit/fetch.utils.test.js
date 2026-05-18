// unit тести для fetch utils
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('робить fetch запит і повертає відповідь', async () => {
    const mockResponse = { ok: true, json: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { fetchWithTimeout } = await import('../../utils/fetch.utils.js');
    const result = await fetchWithTimeout('http://test.com');
    expect(result).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'http://test.com',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('передає signal в fetch запит', async () => {
    const mockResponse = { ok: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const { fetchWithTimeout } = await import('../../utils/fetch.utils.js');
    await fetchWithTimeout('http://test.com', 5000);

    const callArgs = fetch.mock.calls[0];
    expect(callArgs[1]).toHaveProperty('signal');
  });
});
