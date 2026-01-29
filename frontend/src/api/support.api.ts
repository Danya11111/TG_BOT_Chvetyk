import apiClient from './client';

const RETRY_DELAYS_MS = [1000, 2000];

export async function requestSupport(): Promise<{ ok: boolean }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await apiClient.post('/api/support/request', {});
      return response.data?.data;
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  throw lastError;
}

