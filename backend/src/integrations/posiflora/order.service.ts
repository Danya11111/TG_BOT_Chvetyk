import { config } from '../../config';
import { logger } from '../../utils/logger';
import { posifloraApiClient } from './api-client';
import { normalizePhone, posifloraClientService } from './client.service';
import { PosifloraOrderResponse } from './types';

interface PosifloraOrderItem {
  posifloraId: string;
  posifloraType: 'inventory-items' | 'bouquets';
  name: string;
  price: number;
  quantity: number;
}

interface PosifloraOrderPayload {
  orderId: number;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  recipient: {
    name: string;
    phone: string;
  };
  delivery: {
    type: 'delivery' | 'pickup';
    date: string;
    time?: string | null;
    address?: {
      city?: string;
      street?: string;
      house?: string;
      apartment?: string;
    } | null;
  };
  comment?: string | null;
  cardText?: string | null;
  items: PosifloraOrderItem[];
}

interface PosifloraOrderRequest {
  data: {
    type: 'orders';
    attributes: {
      status: string;
      date: string;
      docNo: string;
      description: string;
      budget: number;
      delivery: boolean;
      deliveryComments: string;
      deliveryCity: string;
      deliveryStreet: string;
      deliveryHouse: string;
      deliveryApartment: string;
      deliveryBuilding: string;
      deliveryContact: string;
      deliveryPhoneNumber: string;
      deliveryPhoneCode: string;
      dueTime: string | null;
      deliveryTimeFrom: string | null;
      deliveryTimeTo: string | null;
      createdAt: string;
      updatedAt: string;
      fiscal: boolean;
      byBonuses: boolean;
    };
    relationships: {
      store: {
        data: { type: 'stores'; id: string };
      };
      source: {
        data: { type: 'order-sources'; id: string };
      };
      customer: { data: { type: 'customers'; id: string } } | null;
      lines: {
        data: Array<{
          type: 'order-lines';
          attributes: {
            amount: string;
            discountPrice: string;
            manualSetting: boolean;
            price: string;
            qty: string;
            totalAmount: string;
            totalAmountWithDiscount: string;
          };
          relationships: {
            bouquet: { data: null | { type: 'bouquets'; id: string } };
            item: { data: { type: 'inventory-items'; id: string } };
          };
        }>;
      };
      images: { data: [] };
      discounts: { data: [] };
      courier: { data: null };
      florist: { data: null };
      createdBy?: { data: { type: 'workers'; id: string } };
    };
  };
}

const formatAmount = (value: number): string => value.toFixed(2);

const buildDateTime = (date: string, time?: string | null): string | null => {
  if (!date || !time) return null;
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const combined = new Date(`${date}T${normalizedTime}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
};

const addMinutes = (isoDate: string | null, minutes: number): string | null => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
};

class PosifloraOrderService {
  private ensureEnabled(): void {
    if (!config.posiflora.enabled) {
      throw new Error('Posiflora integration is disabled');
    }
    if (!config.posiflora.storeId || !config.posiflora.orderSourceId) {
      throw new Error('POSIFLORA_STORE_ID and POSIFLORA_ORDER_SOURCE_ID are required');
    }
  }

  private buildOrderPayload(payload: PosifloraOrderPayload, customerId: string | null): PosifloraOrderRequest {
    const dueTime = buildDateTime(payload.delivery.date, payload.delivery.time);
    const deliveryTimeWindow = config.posiflora.deliveryTimeWindowMinutes;
    const deliveryTimeTo = addMinutes(dueTime, deliveryTimeWindow);
    const orderDescriptionParts = [
      `Order ${payload.orderNumber}`,
      payload.cardText ? `Card: ${payload.cardText}` : null,
      payload.comment ? `Comment: ${payload.comment}` : null,
    ].filter(Boolean);

    const normalizedRecipientPhone = normalizePhone(payload.recipient.phone);

    const lines: PosifloraOrderRequest['data']['relationships']['lines']['data'] = payload.items.map((item) => {
      const amount = item.price * item.quantity;
      const isBouquet = item.posifloraType === 'bouquets';
      const inventoryItemId = isBouquet ? config.posiflora.showcaseBouquetItemId : item.posifloraId;

      return {
        type: 'order-lines' as const,
        attributes: {
          amount: formatAmount(amount),
          discountPrice: formatAmount(item.price),
          manualSetting: isBouquet,
          price: formatAmount(item.price),
          qty: formatAmount(item.quantity),
          totalAmount: formatAmount(amount),
          totalAmountWithDiscount: formatAmount(amount),
        },
        relationships: {
          bouquet: isBouquet
            ? {
                data: {
                  type: 'bouquets' as const,
                  id: item.posifloraId,
                },
              }
            : { data: null },
          item: {
            data: {
              type: 'inventory-items' as const,
              id: inventoryItemId,
            },
          },
        },
      };
    });

    const orderPayload: PosifloraOrderRequest = {
      data: {
        type: 'orders',
        attributes: {
          status: 'new',
          date: payload.delivery.date,
          docNo: payload.orderNumber,
          description: orderDescriptionParts.join(' | '),
          budget: 0,
          delivery: payload.delivery.type === 'delivery',
          deliveryComments: payload.comment || '',
          deliveryCity: payload.delivery.address?.city || '',
          deliveryStreet: payload.delivery.address?.street || '',
          deliveryHouse: payload.delivery.address?.house || '',
          deliveryApartment: payload.delivery.address?.apartment || '',
          deliveryBuilding: '',
          deliveryContact: payload.recipient.name,
          deliveryPhoneNumber: normalizedRecipientPhone || payload.recipient.phone,
          deliveryPhoneCode: String(config.posiflora.defaultCountryCode),
          dueTime,
          deliveryTimeFrom: dueTime,
          deliveryTimeTo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fiscal: false,
          byBonuses: false,
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: config.posiflora.storeId,
            },
          },
          source: {
            data: {
              type: 'order-sources',
              id: config.posiflora.orderSourceId,
            },
          },
          customer: customerId
            ? {
                data: {
                  type: 'customers',
                  id: customerId,
                },
              }
            : null,
          lines: {
            data: lines,
          },
          images: { data: [] },
          discounts: { data: [] },
          courier: { data: null },
          florist: { data: null },
        },
      },
    };

    if (config.posiflora.createdByWorkerId) {
      orderPayload.data.relationships.createdBy = {
        data: {
          type: 'workers',
          id: config.posiflora.createdByWorkerId,
        },
      };
    }

    return orderPayload;
  }

  private async preflightOrderDependencies(payload: PosifloraOrderPayload): Promise<void> {
    // Validate configured store/source ids exist (no side effects)
    await posifloraApiClient.request<any>({ method: 'GET', url: `/stores/${config.posiflora.storeId}` });
    await posifloraApiClient.request<any>({ method: 'GET', url: `/order-sources/${config.posiflora.orderSourceId}` });

    const hasBouquets = payload.items.some((item) => item.posifloraType === 'bouquets');
    if (hasBouquets && config.posiflora.showcaseBouquetItemId) {
      await posifloraApiClient.request<any>({
        method: 'GET',
        url: `/inventory-items/${config.posiflora.showcaseBouquetItemId}`,
      });
    }

    // Validate each referenced id exists
    for (const item of payload.items) {
      if (item.posifloraType === 'bouquets') {
        const bouquet = await posifloraApiClient.request<any>({ method: 'GET', url: `/bouquets/${item.posifloraId}` });
        const status = bouquet?.data?.attributes?.status;
        if (status && status !== 'demonstrated') {
          logger.warn('Posiflora dry-run: bouquet is not demonstrated', {
            bouquetId: item.posifloraId,
            status,
          });
        }
      } else {
        await posifloraApiClient.request<any>({ method: 'GET', url: `/inventory-items/${item.posifloraId}` });
      }
    }
  }

  /**
   * Dry-run: verify that referenced ids exist in Posiflora (GET only),
   * build request body, but DO NOT create any orders/customers in Posiflora.
   */
  async dryRunOrder(payload: PosifloraOrderPayload): Promise<PosifloraOrderRequest> {
    this.ensureEnabled();

    if (!payload.items.length) {
      throw new Error('Posiflora order requires at least one item');
    }

    const hasBouquets = payload.items.some((item) => item.posifloraType === 'bouquets');
    if (hasBouquets && !config.posiflora.showcaseBouquetItemId) {
      throw new Error('POSIFLORA_SHOWCASE_BOUQUET_ITEM_ID is required to create orders with showcase bouquets');
    }

    await this.preflightOrderDependencies(payload);

    // Do not sync customer in dry-run (no side effects)
    return this.buildOrderPayload(payload, null);
  }

  async createOrder(payload: PosifloraOrderPayload): Promise<string | null> {
    this.ensureEnabled();

    if (!payload.items.length) {
      throw new Error('Posiflora order requires at least one item');
    }

    const hasBouquets = payload.items.some((item) => item.posifloraType === 'bouquets');
    if (hasBouquets && !config.posiflora.showcaseBouquetItemId) {
      throw new Error('POSIFLORA_SHOWCASE_BOUQUET_ITEM_ID is required to create orders with showcase bouquets');
    }

    const customer = await posifloraClientService.syncCustomer(payload.customer);
    const orderPayload = this.buildOrderPayload(payload, customer?.id || null);

    const response = await posifloraApiClient.request<PosifloraOrderResponse>({
      method: 'POST',
      url: '/orders',
      data: orderPayload,
    });

    logger.info('Posiflora order synced', {
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      posifloraOrderId: response.data.id,
    });

    return response.data.id;
  }
}

export const posifloraOrderService = new PosifloraOrderService();
