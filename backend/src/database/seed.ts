import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pool, testConnection } from './connection';
import { logger } from '../utils/logger';

async function runSeeds(): Promise<void> {
  try {
    // Проверка подключения
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    logger.info('Running seed data...');

    // Пути к файлу seed данных (для разных окружений)
    const seedPaths = [
      // Для production (скомпилированный код)
      join(process.cwd(), 'dist', 'database', 'seeds', '001_sample_data.sql'),
      // Для development (исходный код)
      join(process.cwd(), 'src', 'database', 'seeds', '001_sample_data.sql'),
      // Для Docker
      '/app/src/database/seeds/001_sample_data.sql',
    ];

    let seedPath: string | null = null;
    for (const path of seedPaths) {
      if (existsSync(path)) {
        seedPath = path;
        break;
      }
    }

    if (!seedPath) {
      throw new Error(`Seed file not found. Checked paths: ${seedPaths.join(', ')}`);
    }

    logger.info(`Using seed file: ${seedPath}`);
    const seedSQL = readFileSync(seedPath, 'utf-8');

    // Выполнение seed данных
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(seedSQL);
      await client.query('COMMIT');
      logger.info('✅ Seed data loaded successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      // Игнорируем ошибки о дубликатах (если данные уже загружены)
      if (error instanceof Error && error.message.includes('duplicate key')) {
        logger.warn('Some data already exists. Skipping duplicates...');
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

// Запуск seed данных
if (require.main === module) {
  runSeeds()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed error:', error);
      process.exit(1);
    });
}

export { runSeeds };
