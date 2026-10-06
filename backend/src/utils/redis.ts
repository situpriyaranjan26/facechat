import { createClient } from 'redis';
import { config } from '../config';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisAvailable = false;
let connectionAttempted = false;

// In-memory fallback structures
const memoryStore = new Map<string, { value: string; expiresAt?: number }>();
const hashStore = new Map<string, Map<string, string>>();
const listStore = new Map<string, string[]>();
const setStore = new Map<string, Set<string>>();
const lockStore = new Map<string, number>();

function isExpired(expiresAt?: number): boolean {
  return expiresAt !== undefined && Date.now() > expiresAt;
}

export async function getRedis() {
  if (connectionAttempted && !isRedisAvailable) {
    return null;
  }

  if (!redisClient && !connectionAttempted) {
    connectionAttempted = true;
    try {
      const client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 1000,
          reconnectStrategy: false,
        },
      });

      client.on('error', (err) => {
        if (!isRedisAvailable) {
          logger.info('Redis server not found; using high-performance In-Memory state store');
        } else {
          logger.warn('Redis error:', err);
        }
      });

      await client.connect();
      redisClient = client;
      isRedisAvailable = true;
      logger.info('Connected to Redis server');
    } catch {
      logger.info('Redis not reachable. Activated In-Memory Cache & Ephemeral State Engine');
      isRedisAvailable = false;
      redisClient = null;
    }
  }

  return isRedisAvailable ? redisClient : null;
}

export async function setKey(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = await getRedis();
  if (client) {
    if (ttlSeconds) {
      await client.set(key, value, { EX: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return;
  }

  // Memory fallback
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
  memoryStore.set(key, { value, expiresAt });
}

export async function getKey(key: string): Promise<string | null> {
  const client = await getRedis();
  if (client) {
    return client.get(key);
  }

  const item = memoryStore.get(key);
  if (!item) return null;
  if (isExpired(item.expiresAt)) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

export async function deleteKey(key: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.del(key);
    return;
  }

  memoryStore.delete(key);
  hashStore.delete(key);
  listStore.delete(key);
  setStore.delete(key);
  lockStore.delete(key);
}

export async function setHash(key: string, field: string, value: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.hSet(key, field, value);
    return;
  }

  if (!hashStore.has(key)) hashStore.set(key, new Map());
  hashStore.get(key)!.set(field, value);
}

export async function getHash(key: string, field: string): Promise<string | null> {
  const client = await getRedis();
  if (client) {
    const val = await client.hGet(key, field);
    return val ?? null;
  }

  return hashStore.get(key)?.get(field) ?? null;
}

export async function getAllHash(key: string): Promise<Record<string, string>> {
  const client = await getRedis();
  if (client) {
    return client.hGetAll(key);
  }

  const map = hashStore.get(key);
  if (!map) return {};
  const res: Record<string, string> = {};
  map.forEach((v, k) => { res[k] = v; });
  return res;
}

export async function deleteHashField(key: string, field: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.hDel(key, field);
    return;
  }

  hashStore.get(key)?.delete(field);
}

export async function pushToList(key: string, value: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.rPush(key, value);
    return;
  }

  if (!listStore.has(key)) listStore.set(key, []);
  listStore.get(key)!.push(value);
}

export async function popFromList(key: string): Promise<string | null> {
  const client = await getRedis();
  if (client) {
    return client.lPop(key);
  }

  const list = listStore.get(key);
  if (!list || list.length === 0) return null;
  return list.shift() ?? null;
}

export async function getListLength(key: string): Promise<number> {
  const client = await getRedis();
  if (client) {
    return client.lLen(key);
  }

  return listStore.get(key)?.length ?? 0;
}

export async function getListRange(key: string, start: number, end: number): Promise<string[]> {
  const client = await getRedis();
  if (client) {
    return client.lRange(key, start, end);
  }

  const list = listStore.get(key) || [];
  const stop = end === -1 ? list.length : end + 1;
  return list.slice(start, stop);
}

export async function removeFromList(key: string, value: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.lRem(key, 0, value);
    return;
  }

  const list = listStore.get(key);
  if (!list) return;
  const filtered = list.filter((item) => item !== value);
  listStore.set(key, filtered);
}

export async function increment(key: string, ttlSeconds?: number): Promise<number> {
  const client = await getRedis();
  if (client) {
    const val = await client.incr(key);
    if (ttlSeconds && val === 1) {
      await client.expire(key, ttlSeconds);
    }
    return val;
  }

  const existing = memoryStore.get(key);
  let nextVal = 1;
  if (existing && !isExpired(existing.expiresAt)) {
    nextVal = parseInt(existing.value, 10) + 1;
  }
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : existing?.expiresAt;
  memoryStore.set(key, { value: String(nextVal), expiresAt });
  return nextVal;
}

export async function expire(key: string, ttlSeconds: number): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.expire(key, ttlSeconds);
    return;
  }

  const existing = memoryStore.get(key);
  if (existing) {
    existing.expiresAt = Date.now() + ttlSeconds * 1000;
  }
}

export async function addToSet(key: string, member: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.sAdd(key, member);
    return;
  }

  if (!setStore.has(key)) setStore.set(key, new Set());
  setStore.get(key)!.add(member);
}

export async function removeFromSet(key: string, member: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await client.sRem(key, member);
    return;
  }

  setStore.get(key)?.delete(member);
}

export async function isMemberOfSet(key: string, member: string): Promise<boolean> {
  const client = await getRedis();
  if (client) {
    return client.sIsMember(key, member);
  }

  return setStore.get(key)?.has(member) ?? false;
}

export async function getSetMembers(key: string): Promise<string[]> {
  const client = await getRedis();
  if (client) {
    return client.sMembers(key);
  }

  const set = setStore.get(key);
  return set ? Array.from(set) : [];
}

export async function acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
  const client = await getRedis();
  if (client) {
    const result = await client.set(`lock:${key}`, '1', { NX: true, EX: ttlSeconds });
    return result === 'OK';
  }

  const now = Date.now();
  const lockExpire = lockStore.get(key);
  if (lockExpire && lockExpire > now) {
    return false;
  }

  lockStore.set(key, now + ttlSeconds * 1000);
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  const client = await getRedis();
  if (client) {
    await deleteKey(`lock:${key}`);
    return;
  }

  lockStore.delete(key);
}
