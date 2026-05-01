import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS } = env;

  const redisOptions: Record<string, string | boolean | number> = {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT, 10),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
  };

  if (REDIS_PASSWORD) {
    redisOptions.password = REDIS_PASSWORD;
  }

  if (REDIS_TLS === 'true' || REDIS_TLS === '1') {
    redisOptions.tls = true;
  }

  const client = new Redis(redisOptions as ConstructorParameters<typeof Redis>[0]);

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
      console.log('Redis disconnected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Redis disconnect error';
      console.error('Redis disconnect failed:', errorMessage);
      throw error;
    }
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const data = await client.get(key);
  if (data) {
    return JSON.parse(data) as T;
  }
  return null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  const ttl = ttlSeconds || parseInt(env.INSIGHT_CACHE_TTL_SECONDS, 10);
  await client.setex(key, ttl, JSON.stringify(value));
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
