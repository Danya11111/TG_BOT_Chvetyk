import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { posifloraApiClient } from './api-client';
import { config } from '../../config';

interface PosifloraCustomerAttributes {
  title?: string;
  phone?: string;
  email?: string | null;
  currentPoints?: number;
  updatedAt?: string;
}

interface PosifloraCustomer {
  id: string;
  type: 'customers';
  attributes: PosifloraCustomerAttributes;
}

interface PosifloraCustomersResponse {
  data: PosifloraCustomer[];
  meta?: {
    page?: {
      number?: number;
      size?: number;
    };
    total?: number;
  };
}

export async function syncCustomersFromPosiflora(): Promise<void> {
  if (!config.posiflora.enabled || !config.posiflora.customersSyncEnabled) {
    logger.info('Posiflora customers sync skipped: disabled');
    return;
  }

  logger.info('Posiflora customers sync started');
  const pageSize = config.posiflora.customersPageSize;
  let page = 1;
  let total = 0;
  let processed = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    do {
      const response = await posifloraApiClient.request<PosifloraCustomersResponse>({
        method: 'GET',
        url: '/customers',
        params: {
          'page[number]': page,
          'page[size]': pageSize,
        },
      });

      const customers = response.data || [];
      total = response.meta?.total || total || customers.length;

      for (const customer of customers) {
        const attrs = customer.attributes || {};
        await client.query(
          `
            INSERT INTO posiflora_customers (
              posiflora_id,
              title,
              phone,
              email,
              current_points,
              updated_at,
              raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (posiflora_id) DO UPDATE
              SET title = EXCLUDED.title,
                  phone = EXCLUDED.phone,
                  email = EXCLUDED.email,
                  current_points = EXCLUDED.current_points,
                  updated_at = EXCLUDED.updated_at,
                  raw_data = EXCLUDED.raw_data;
          `,
          [
            customer.id,
            attrs.title || null,
            attrs.phone || null,
            attrs.email || null,
            attrs.currentPoints || 0,
            attrs.updatedAt ? new Date(attrs.updatedAt) : new Date(),
            JSON.stringify(customer),
          ]
        );
      }

      processed += customers.length;
      if (!customers.length) break;

      const pageNumber = response.meta?.page?.number || page;
      const pageSizeActual = response.meta?.page?.size || pageSize;
      if (processed >= total) break;
      if (!pageSizeActual) break;

      page = pageNumber + 1;
    } while (processed < total);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Posiflora customers sync failed', error);
    throw error;
  } finally {
    client.release();
  }

  logger.info('Posiflora customers sync finished', { processed });
}
