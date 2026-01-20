// Статусы заказов (будет синхронизировано с Posiflora)
export const ORDER_STATUSES = {
  NEW: 'new',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY: 'ready',
  SHIPPED: 'shipped',
  IN_DELIVERY: 'in_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

// Типы доставки
export const DELIVERY_TYPES = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
} as const;

// Типы оплаты
export const PAYMENT_TYPES = {
  CASH: 'cash',
  CARD: 'card',
  ONLINE: 'online',
  TRANSFER: 'transfer',
  CARD_REQUISITES: 'card_requisites',
  SBP_QR: 'sbp_qr',
} as const;

export const PAYMENT_STATUSES = {
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
} as const;

// Типы операций с бонусами
export const BONUS_OPERATION_TYPES = {
  ACCRUED: 'accrued',
  USED: 'used',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

// Время кэширования (в секундах)
export const CACHE_TTL = {
  PRODUCTS: 3600, // 1 час
  CATEGORIES: 7200, // 2 часа
  CART: 86400, // 24 часа
  PICKUP_POINTS: 3600, // 1 час
} as const;

// Настройки по умолчанию
export const DEFAULT_SETTINGS = {
  MIN_ORDER_AMOUNT: 0, // Минимальная сумма заказа (будет настроено позже)
  BONUS_PERCENT: 0, // Процент начисления бонусов (будет настроено позже)
  CURRENCY: 'RUB',
  FREE_DELIVERY_THRESHOLD: 0, // Порог бесплатной доставки (будет настроено позже)
} as const;
