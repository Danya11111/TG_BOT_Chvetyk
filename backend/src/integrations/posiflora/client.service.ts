import { config } from '../../config';
import { logger } from '../../utils/logger';
import { posifloraApiClient } from './api-client';
import { PosifloraCustomersResponse, PosifloraCustomerResource } from './types';

const PHONE_DIGITS = /\D/g;

const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(PHONE_DIGITS, '');
  return digits.length ? digits : null;
};

const buildCustomerSourceRelationship = () => {
  if (!config.posiflora.customerSourceId) return undefined;
  return {
    customerSources: {
      data: [
        {
          type: 'customer-sources',
          id: config.posiflora.customerSourceId,
        },
      ],
    },
  };
};

const findMatchingCustomer = (customers: PosifloraCustomerResource[], phone: string) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return customers[0];
  return (
    customers.find((customer) => normalizePhone(customer.attributes.phone) === normalized) ||
    customers[0]
  );
};

class PosifloraClientService {
  async getCustomerById(id: string): Promise<PosifloraCustomerResource | null> {
    if (!id) return null;
    try {
      const response = await posifloraApiClient.request<{ data: PosifloraCustomerResource }>({
        method: 'GET',
        url: `/customers/${id}`,
      });
      return response?.data || null;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) return null;
      throw error;
    }
  }

  async findCustomerByPhone(phone: string): Promise<PosifloraCustomerResource | null> {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;

    const response = await posifloraApiClient.request<PosifloraCustomersResponse>({
      method: 'GET',
      url: '/customers',
      params: { search: normalized },
    });

    if (!response?.data?.length) return null;
    return findMatchingCustomer(response.data, normalized);
  }

  async createCustomer(params: {
    name: string;
    phone: string;
    email?: string | null;
  }): Promise<PosifloraCustomerResource> {
    const normalized = normalizePhone(params.phone) || params.phone;
    const response = await posifloraApiClient.request<{ data: PosifloraCustomerResource }>({
      method: 'POST',
      url: '/customers',
      data: {
        data: {
          type: 'customers',
          attributes: {
            title: params.name,
            phone: normalized,
            email: params.email || null,
            isPerson: true,
            countryCode: config.posiflora.defaultCountryCode,
            status: 'on',
          },
          relationships: {
            ...buildCustomerSourceRelationship(),
          },
        },
      },
    });

    return response.data;
  }

  async updateCustomer(
    id: string,
    params: { name: string; phone: string; email?: string | null }
  ): Promise<PosifloraCustomerResource> {
    const normalized = normalizePhone(params.phone) || params.phone;
    const response = await posifloraApiClient.request<{ data: PosifloraCustomerResource }>({
      method: 'PATCH',
      url: `/customers/${id}`,
      data: {
        data: {
          type: 'customers',
          id,
          attributes: {
            title: params.name,
            phone: normalized,
            email: params.email || null,
            countryCode: config.posiflora.defaultCountryCode,
          },
          relationships: {
            ...buildCustomerSourceRelationship(),
          },
        },
      },
    });

    return response.data;
  }

  async setCustomerPoints(id: string, points: number): Promise<PosifloraCustomerResource> {
    const normalizedPoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
    const response = await posifloraApiClient.request<{ data: PosifloraCustomerResource }>({
      method: 'PATCH',
      url: `/customers/${id}`,
      data: {
        data: {
          type: 'customers',
          id,
          attributes: {
            currentPoints: normalizedPoints,
          },
        },
      },
    });
    return response.data;
  }

  async syncCustomer(params: {
    name: string;
    phone: string;
    email?: string | null;
  }): Promise<PosifloraCustomerResource | null> {
    try {
      const existing = await this.findCustomerByPhone(params.phone);
      if (!existing) {
        return await this.createCustomer(params);
      }
      return await this.updateCustomer(existing.id, params);
    } catch (error) {
      logger.error('Failed to sync Posiflora customer', {
        error: error instanceof Error ? error.message : String(error),
        phone: params.phone,
      });
      return null;
    }
  }
}

export const posifloraClientService = new PosifloraClientService();
export { normalizePhone };
