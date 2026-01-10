import dotenv from 'dotenv';

dotenv.config();

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
  
  // Posiflora API (будет заполнено позже)
  posiflora: {
    apiUrl: process.env.POSIFLORA_API_URL || '',
    apiKey: process.env.POSIFLORA_API_KEY || '',
    // Дополнительные настройки будут добавлены позже
  },
  
  // Managers for notifications
  managers: {
    telegramIds: process.env.MANAGER_TELEGRAM_IDS 
      ? process.env.MANAGER_TELEGRAM_IDS.split(',').map(id => id.trim())
      : [],
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
};

// Валидация обязательных переменных
if (!config.telegram.botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}
