import { readFileSync } from 'fs';
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

    // Чтение SQL файла миграции
    // Для tsx используем process.cwd(), для production - __dirname из dist
    const migrationPath = join(
      process.cwd(),
      process.env.NODE_ENV === 'production' ? 'dist' : 'src',
      'database',
      'migrations',
      '001_initial_schema.sql'
    );
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
      throw error;
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
