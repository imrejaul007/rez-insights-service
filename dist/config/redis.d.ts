import IORedis from 'ioredis';
type RedisClient = IORedis;
declare let redisClient: RedisClient | null;
export declare function createRedisClient(): RedisClient;
export declare function connectRedis(): Promise<RedisClient>;
export declare function disconnectRedis(): Promise<void>;
export declare function getRedis(): RedisClient;
export { redisClient as redis };
export { getRedis as getRedisClient };
export declare function cacheGet<T>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
export declare function cacheDel(key: string): Promise<void>;
export declare function cacheDelete(key: string): Promise<void>;
export declare function cacheDeletePattern(pattern: string): Promise<void>;
//# sourceMappingURL=redis.d.ts.map