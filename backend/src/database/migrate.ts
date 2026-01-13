import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pool, testConnection } from './connection';
import { logger } from '../utils/logger';

async function runMigrations(): Promise<void> {
  try {
    // Проверка подключения
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    logger.info('Running migrations...');

    // Пути к файлу миграции (для разных окружений)
    const migrationPaths = [
      // Для production (скомпилированный код)
      join(process.cwd(), 'dist', 'database', 'migrations', '001_initial_schema.sql'),
      // Для development (исходный код)
      join(process.cwd(), 'src', 'database', 'migrations', '001_initial_schema.sql'),
      // Для Docker
      '/app/src/database/migrations/001_initial_schema.sql',
    ];

    let migrationPath: string | null = null;
    for (const path of migrationPaths) {
      if (existsSync(path)) {
        migrationPath = path;
        break;
      }
    }

    if (!migrationPath) {
      throw new Error(`Migration file not found. Checked paths: ${migrationPaths.join(', ')}`);
    }

    logger.info(`Using migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Выполнение миграции
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      logger.info('✅ Migrations completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      // Игнорируем ошибки о существующих таблицах (если миграции уже выполнены)
      if (error instanceof Error && error.message.includes('already exists')) {
        logger.warn('Some tables already exist. Skipping...');
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Запуск миграций
if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}

export { runMigrations };
