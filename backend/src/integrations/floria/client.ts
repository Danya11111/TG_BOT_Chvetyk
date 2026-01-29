import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { FloriaProductRaw, FloriaProductsParams } from './types';

const baseURL = config.floria.apiBaseUrl.replace(/\/$/, '');
const timeout = config.floria.requestTimeoutMs || 15000;

function createClient(): AxiosInstance {
  const token = config.floria.token;
  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.response?.data?.error || err.message;
      logger.warn('Floria API error', {
        status,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        url: err.config?.url,
      });
      throw err;
    }
  );

  return client;
}

const client = createClient();

const RETRY_DELAYS_MS = [1000, 2000];

function shouldRetry(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const ax = err as { code?: string; response?: { status?: number } };
  if (ax.code === 'ECONNABORTED') return true;
  if (ax.response?.status != null && ax.response.status >= 500) return true;
  if (!ax.response) return true; // network error
  return false;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length && shouldRetry(err)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

function buildQuery(params: FloriaProductsParams): Record<string, string | number> {
  const q: Record<string, string | number> = {};
  if (params.categoryId !== undefined) q.categoryId = params.categoryId;
  if (params.limit !== undefined) q.limit = params.limit;
  if (params.offset !== undefined) q.offset = params.offset;
  if (params.searchQuery !== undefined && params.searchQuery !== '') q.searchQuery = params.searchQuery;
  if (params.needComposition !== undefined) q.needComposition = params.needComposition;
  if (params.productId !== undefined) q.productId = params.productId;
  return q;
}

/**
 * GET /api/products with optional filters. Returns array of Floria product objects.
 * Retries up to 2 times on network error, timeout, or 5xx.
 */
export async function getFloriaProducts(params: FloriaProductsParams = {}): Promise<FloriaProductRaw[]> {
  const query = buildQuery(params);
  const data = await withRetry(async () => {
    const response = await client.get<FloriaProductRaw[]>('/api/products', { params: query });
    return response.data;
  });
  if (!Array.isArray(data)) {
    logger.warn('Floria API returned non-array', { type: typeof data });
    return [];
  }
  return data;
}

/**
 * Get a single product by id from Floria API.
 * Pass needComposition: 1 to include composition in the response.
 */
export async function getFloriaProductById(
  productId: number,
  needComposition: 0 | 1 = 1
): Promise<FloriaProductRaw | null> {
  const list = await getFloriaProducts({ productId, limit: 1, needComposition });
  const first = list[0];
  if (!first || Number(first.id) !== Number(productId)) {
    return null;
  }
  return first;
}
