import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.js';

const { Pool } = pkg;

export { schema };

export function createDatabase(connectionString: string, maxConnections = 10) {
  const pool = new Pool({
    connectionString,
    max: maxConnections,
  });

  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
