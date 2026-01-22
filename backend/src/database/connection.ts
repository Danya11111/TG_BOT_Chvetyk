import { Pool, PoolConfig } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const poolConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Логируем параметры подключения (без пароля) для диагностики
logger.info('Database connection config', {
  host: poolConfig.host,
  port: poolConfig.port,
  user: poolConfig.user,
  database: poolConfig.database,
  dbNameFromEnv: process.env.DB_NAME,
});

export const pool = new Pool(poolConfig);

// Экспорт db для удобства использования
export const db = pool;

// Обработка ошибок подключения
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  // Не завершаем процесс сразу, только логируем ошибку
  // process.exit(-1);
});

// Логируем успешное создание пула
pool.on('connect', (client) => {
  logger.debug('New database client connected', {
    database: poolConfig.database,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
  });
});

// Тест подключения
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connection established');
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
}
