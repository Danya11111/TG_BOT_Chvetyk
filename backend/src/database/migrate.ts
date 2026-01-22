import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool, testConnection } from './connection';
import { logger } from '../utils/logger';

const ensureMigrationsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  } finally {
    client.release();
  }
};

const getExecutedMigrations = async (): Promise<Set<string>> => {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
};

async function runMigrations(): Promise<void> {
  try {
    // Проверка подключения
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    logger.info('Running migrations...');

    // Пути к директориям миграций (для разных окружений)
    const migrationDirs = [
      join(process.cwd(), 'dist', 'database', 'migrations'),
      join(process.cwd(), 'src', 'database', 'migrations'),
      '/app/dist/database/migrations', // Production путь в Docker
      '/app/src/database/migrations', // Fallback для development в Docker
    ];

    const migrationDir = migrationDirs.find((dir) => existsSync(dir));
    if (!migrationDir) {
      throw new Error(`Migration directory not found. Checked: ${migrationDirs.join(', ')}`);
    }

    await ensureMigrationsTable();
    const executed = await getExecutedMigrations();

    const files = readdirSync(migrationDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.warn(`No migration files found in ${migrationDir}`);
      return;
    }

    logger.info(`Using migration directory: ${migrationDir}`);

    for (const file of files) {
      if (executed.has(file)) {
        logger.info(`Skipping migration ${file} (already applied)`);
        continue;
      }

      const filePath = join(migrationDir, file);
      const migrationSQL = readFileSync(filePath, 'utf-8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`✅ Migration applied: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    logger.info('✅ All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Запуск миграций
// Проверяем, запущен ли файл напрямую (через node или tsx)
const isMainModule = 
  typeof require !== 'undefined' && require.main === module ||
  process.argv[1]?.endsWith('migrate.js') ||
  process.argv[1]?.endsWith('migrate.ts');

if (isMainModule) {
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
