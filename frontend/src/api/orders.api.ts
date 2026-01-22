import apiClient from './client';
import { CartItem } from '../store/cart.store';
import { CheckoutFormData } from '../store/checkout.store';

export interface CreateOrderResponse {
  id: number;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface OrderStatusResponse extends CreateOrderResponse {
  items: Array<{
    product_name: string;
    product_price: number;
    quantity: number;
    total: number;
    product_image?: string;
  }>;
  delivery_type?: string;
  delivery_address?: {
    city?: string;
    street?: string;
    house?: string;
    apartment?: string;
    postalCode?: string;
  } | null;
  delivery_date?: string;
  delivery_time?: string;
  payment_type?: string;
  comment?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  card_text?: string | null;
  history?: Array<{
    status: string;
    comment?: string | null;
    changed_at: string;
  }>;
}

export interface OrdersListItem {
  id: number;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export async function createOrder(
  formData: CheckoutFormData,
  items: CartItem[]
): Promise<CreateOrderResponse> {
  const payload = {
    customer: {
      name: formData.name,
      phone: formData.phone,
      email: formData.email || null,
    },
    delivery: {
      type: formData.deliveryType,
      address: formData.deliveryType === 'delivery' ? formData.address : undefined,
      pickupPointId: formData.pickupPointId || null,
      date: formData.deliveryDate,
      time: formData.deliveryTime,
    },
    recipient: {
      name: formData.recipientName,
      phone: formData.recipientPhone,
    },
    cardText: formData.cardText,
    comment: formData.comment || '',
    paymentType: formData.paymentType,
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      image: item.image || null,
    })),
  };

  const response = await apiClient.post('/api/orders', payload);
  return response.data.data;
}

export async function getOrderStatus(orderId: number): Promise<OrderStatusResponse> {
  const response = await apiClient.get(`/api/orders/${orderId}`);
  return response.data.data;
}

export async function getOrders(): Promise<OrdersListItem[]> {
  const response = await apiClient.get('/api/orders');
  return response.data.data.orders;
}

export async function uploadReceipt(
  orderId: number,
  imageDataUrl: string,
  fileName?: string | null
): Promise<{ ok: boolean }> {
  const response = await apiClient.post(`/api/orders/${orderId}/receipt`, {
    imageDataUrl,
    fileName: fileName || null,
  });
  return response.data.data;
}
