import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

import { sql as drizzleSql } from 'drizzle-orm';

async function cleanup() {
  console.log('Cleaning up database...');
  await db.execute(drizzleSql.raw('TRUNCATE tournaments CASCADE;'));
  console.log('Cleanup complete.');
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
