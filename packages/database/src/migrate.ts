import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
import { logger } from '@soroban-indexer/shared';
import * as dotenv from 'dotenv';
import path from 'path';

const { Pool } = pkg;
dotenv.config();

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  logger.info('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    logger.info('Migrations completed successfully.');
  } catch (error) {
    logger.error({ error }, 'Failed to run migrations');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };
