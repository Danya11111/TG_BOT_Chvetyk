import apiClient from './client';

export async function requestSupport(): Promise<{ ok: boolean }> {
  const response = await apiClient.post('/api/support/request', {});
  return response.data?.data;
}

