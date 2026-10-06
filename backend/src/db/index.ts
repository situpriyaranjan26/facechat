import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
import { embeddedDb } from './embeddedDb';

let pool: Pool | null = null;
let usePostgres = false;
let checkDone = false;

async function initDb(): Promise<boolean> {
  if (checkDone) return usePostgres;
  checkDone = true;

  try {
    const testPool = new Pool({
      connectionString: config.database.url,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 5000,
    });

    testPool.on('error', () => {
      // suppress idle pool errors during probing
    });

    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();

    pool = testPool;
    usePostgres = true;
    logger.info('Connected to PostgreSQL database');
    return true;
  } catch {
    usePostgres = false;
    pool = null;
    logger.info('PostgreSQL not detected. Running on Embedded Database Engine (Full persistence, zero setup required)');
    return false;
  }
}

export function getPool(): Pool | null {
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  if (!checkDone) {
    await initDb();
  }

  if (usePostgres && pool) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        logger.warn('Slow query detected', { text: text.substring(0, 100), duration });
      }
      return result;
    } catch (error) {
      logger.error('PostgreSQL query error, falling back to embedded DB', { text: text.substring(0, 100), error });
      return embeddedDb.executeSql<T>(text, params);
    }
  }

  return embeddedDb.executeSql<T>(text, params);
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!checkDone) {
    await initDb();
  }

  if (usePostgres && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Embedded DB Transaction
  embeddedDb.beginTransaction();
  try {
    const fakeClient = {
      query: (sql: string, p?: any[]) => embeddedDb.executeSql(sql, p),
    };
    const result = await callback(fakeClient);
    embeddedDb.commitTransaction();
    return result;
  } catch (error) {
    embeddedDb.rollbackTransaction();
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  await initDb();
  return true;
}
