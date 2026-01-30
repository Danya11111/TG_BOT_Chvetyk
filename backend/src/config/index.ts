import dotenv from 'dotenv';
import { customerData } from './customer-data';

dotenv.config();

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

const requiredInProduction = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'TELEGRAM_BOT_TOKEN',
  'API_URL',
  'WEBAPP_URL',
  'CORS_ORIGIN',
];

export const config = {
  // Server
  port: parseInt(process.env.BACKEND_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'chvetyk',
    password: process.env.DB_PASSWORD || 'chvetyk_password',
    database: process.env.DB_NAME || 'chvetyk_db',
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  
  // Telegram Bot
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webappUrl: process.env.WEBAPP_URL || 'http://localhost:5173',
  },
  
  // Floria API (products)
  floria: {
    apiBaseUrl: process.env.FLORIA_API_BASE_URL || 'https://flowers5-serv.uplinkweb.ru/5042',
    token: process.env.FLORIA_API_TOKEN || '',
    requestTimeoutMs: parseInt(process.env.FLORIA_REQUEST_TIMEOUT_MS || '15000', 10),
    syncCron: process.env.FLORIA_SYNC_CRON || '0,20,40 * * * *',
    syncOnStartup: process.env.FLORIA_SYNC_ON_STARTUP !== 'false',
  },

  // Posiflora API
  posiflora: {
    enabled: process.env.POSIFLORA_ENABLED === 'true',
    apiUrl: process.env.POSIFLORA_API_URL || '',
    username: process.env.POSIFLORA_USERNAME || '',
    password: process.env.POSIFLORA_PASSWORD || '',
    storeId: process.env.POSIFLORA_STORE_ID || '',
    orderSourceId: process.env.POSIFLORA_ORDER_SOURCE_ID || '',
    customerSourceId: process.env.POSIFLORA_CUSTOMER_SOURCE_ID || '',
    createdByWorkerId: process.env.POSIFLORA_CREATED_BY_WORKER_ID || '',
    // Used to create order-lines for showcase bouquets (bouquets require an inventory-item in order-line)
    showcaseBouquetItemId: process.env.POSIFLORA_SHOWCASE_BOUQUET_ITEM_ID || '',
    // Controls whether we actually POST /orders or only preflight-check dependencies (no live orders)
    orderCreateMode: (process.env.POSIFLORA_ORDER_CREATE_MODE || 'dry-run') as 'live' | 'dry-run',
    defaultCountryCode: parseInt(process.env.POSIFLORA_DEFAULT_COUNTRY_CODE || '7', 10),
    deliveryTimeWindowMinutes: parseInt(process.env.POSIFLORA_DELIVERY_TIME_WINDOW_MINUTES || '60', 10),
    requestTimeoutMs: parseInt(process.env.POSIFLORA_REQUEST_TIMEOUT_MS || '15000', 10),
    syncEnabled: process.env.POSIFLORA_SYNC_ENABLED === 'true',
    syncCron: process.env.POSIFLORA_SYNC_CRON || '10,30,50 * * * *',
    syncOnStartup: process.env.POSIFLORA_SYNC_ON_STARTUP !== 'false',
    catalogPageSize: parseInt(process.env.POSIFLORA_CATALOG_PAGE_SIZE || '50', 10),
    includeItemDetails: process.env.POSIFLORA_INCLUDE_ITEM_DETAILS !== 'false',
    customersSyncEnabled: process.env.POSIFLORA_CUSTOMERS_SYNC_ENABLED === 'true',
    customersPageSize: parseInt(process.env.POSIFLORA_CUSTOMERS_PAGE_SIZE || '50', 10),
  },
  
  // Managers for notifications
  managers: {
    telegramIds: process.env.MANAGER_TELEGRAM_IDS 
      ? process.env.MANAGER_TELEGRAM_IDS.split(',').map(id => id.trim())
      : [],
    groupChatId: process.env.MANAGER_GROUP_CHAT_ID || customerData.managerGroupChatId,
  },

  // Orders moderation chat/topic (payments, receipts, approve/reject)
  orders: {
    groupChatId:
      toInt(process.env.ORDERS_GROUP_CHAT_ID) ||
      toInt(process.env.MANAGER_GROUP_CHAT_ID) ||
      toInt(customerData.managerGroupChatId) ||
      null,
    // Optional: forum topic id (message_thread_id) for "Заказы"
    threadId: toInt(process.env.ORDERS_THREAD_ID) || null,
  },

  // Support contacts
  support: {
    managerPhone: customerData.managerPhone,
    groupChatId:
      toInt(process.env.SUPPORT_GROUP_CHAT_ID) ||
      toInt(process.env.MANAGER_GROUP_CHAT_ID) ||
      toInt(customerData.managerGroupChatId) ||
      null,
    // Optional: forum topic id (message_thread_id) for "Поддержка клиентов"
    logThreadId: toInt(process.env.SUPPORT_LOG_THREAD_ID) || null,
    // For displaying timestamps in logs
    timeZone: process.env.SUPPORT_TIME_ZONE || 'Europe/Moscow',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'https://kyong-unsonorous-sceptically.ngrok-free.dev',
      /\.ngrok-free\.app$/,
      /\.ngrok-free\.dev$/,
      /\.ngrok\.io$/,
    ],
    credentials: true,
  },

  migrations: {
    enabled: process.env.RUN_MIGRATIONS !== 'false',
  },
};

function validateEnv(): void {
  if (!config.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  if (config.nodeEnv === 'production') {
    requiredInProduction.forEach((key) => {
      if (!process.env[key]) {
        throw new Error(`Environment variable ${key} is required in production`);
      }
    });
  }
}

validateEnv();
