import crypto from 'crypto';
import { config } from '../config';
import { logger } from './logger';
import { TelegramUser } from '../types/telegram';

export interface TelegramInitDataPayload {
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
  chat_instance?: string;
  query_id?: string;
}

/**
 * Валидация данных от Telegram WebApp
 * Проверяет подпись данных используя bot token
 */
export function validateTelegramWebAppData(
  initData: string,
  botToken: string
): boolean {
  try {
    // Парсинг initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    if (!hash) {
      logger.warn('Telegram WebApp validation failed: no hash');
      return false;
    }

    // Сортировка параметров
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создание секретного ключа
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисление хеша
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Проверка хеша
    const isValid = calculatedHash === hash;

    if (!isValid) {
      logger.warn('Telegram WebApp validation failed: invalid hash');
    }

    return isValid;
  } catch (error) {
    logger.error('Error validating Telegram WebApp data:', error);
    return false;
  }
}

/**
 * Извлечение данных пользователя из initData
 */
export function parseTelegramWebAppData(initData: string): TelegramInitDataPayload {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    
    return {
      user: userStr ? JSON.parse(userStr) : undefined,
      auth_date: urlParams.get('auth_date') ? parseInt(urlParams.get('auth_date')!, 10) : undefined,
      hash: urlParams.get('hash') || undefined,
      chat_instance: urlParams.get('chat_instance') || undefined,
      query_id: urlParams.get('query_id') || undefined,
    };
  } catch (error) {
    logger.error('Error parsing Telegram WebApp data:', error);
    return {};
  }
}

/**
 * Проверка актуальности данных (не старше 24 часов)
 */
export function isTelegramDataFresh(authDate?: number, maxAgeSeconds = 300): boolean {
  if (!authDate) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return now - authDate < maxAgeSeconds;
}
