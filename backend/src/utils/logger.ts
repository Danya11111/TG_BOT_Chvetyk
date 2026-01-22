import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { config } from '../config';

const logsDir = path.resolve(process.cwd(), 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  // if we can't create logs dir, file transports may fail later
}

// Список полей, которые нужно скрыть в логах
const sensitiveFields = [
  'password',
  'token',
  'initData',
  'cardNumber',
  'botToken',
  'apiKey',
  'secret',
  'authorization',
  'x-telegram-init-data',
];

// Функция для очистки чувствительных данных из объектов
function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Проверяем, не содержит ли строка чувствительные данные
    for (const field of sensitiveFields) {
      if (data.toLowerCase().includes(field.toLowerCase())) {
        return '***REDACTED***';
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()));
      
      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
}

// Форматтер для очистки чувствительных данных
const sanitizeFormat = winston.format((info) => {
  if (info.meta) {
    info.meta = sanitizeLogData(info.meta);
  }
  if (info.message && typeof info.message === 'object') {
    info.message = sanitizeLogData(info.message);
  }
  return info;
});

const logFormat = winston.format.combine(
  sanitizeFormat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  sanitizeFormat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      const sanitizedMeta = sanitizeLogData(meta);
      msg += ` ${JSON.stringify(sanitizedMeta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'chvetyk-backend' },
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

// В production тоже выводим в консоль для Docker логов
logger.add(
  new winston.transports.Console({
    format: consoleFormat,
  })
);
