import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS } = env;

  const client = new Redis({
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT, 10),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
    password: REDIS_PASSWORD || undefined,
    tls: REDIS_TLS === 'true' || REDIS_TLS === '1' ? {} : undefined,
  });

  client.on('connect', () => {
    console.log('Redis client connected');
  });

  client.on('ready', () => {
    console.log('Redis client ready');
  });

  client.on('error', (error) => {
    console.error('Redis client error:', error);
  });

  client.on('close', () => {
    console.warn('Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  return client;
}

export async function connectRedis(): Promise<Redis> {
  if (!redisClient) {
    redisClient = createRedisClient();
  }

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis connection error';
    console.error('Redis connection failed:', errorMessage);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis disconnected');
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

// Cache helper functions
export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  return client.get(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  if (ttlSeconds) {
    await client.setex(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
