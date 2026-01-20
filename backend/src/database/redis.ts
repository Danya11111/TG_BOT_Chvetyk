import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connection established');
    });

    await redisClient.connect();
  }

  return redisClient;
}

// Кэш для корзины пользователя
export async function getCartCacheKey(userId: number): Promise<string> {
  return `cart:${userId}`;
}

// Кэш для товаров
export async function getProductsCacheKey(categoryId?: number): Promise<string> {
  return categoryId ? `products:category:${categoryId}` : 'products:all';
}

// Кэш для категорий
export async function getCategoriesCacheKey(): Promise<string> {
  return 'categories:all';
}

// Вспомогательные функции для работы с кэшем
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const client = await getRedisClient();
      const stringValue = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, stringValue);
      } else {
        await client.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Redis SET error:', error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (error) {
      logger.error('Redis DELETE error:', error);
    }
  },

  async clearPattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      logger.error('Redis CLEAR PATTERN error:', error);
    }
  },
};
