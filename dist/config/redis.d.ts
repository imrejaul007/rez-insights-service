import Redis from 'ioredis';
export declare function createRedisClient(): Redis;
export declare function connectRedis(): Promise<Redis>;
export declare function disconnectRedis(): Promise<void>;
export declare function getRedisClient(): Redis;
export declare function cacheGet(key: string): Promise<string | null>;
export declare function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void>;
export declare function cacheDelete(key: string): Promise<void>;
export declare function cacheDeletePattern(pattern: string): Promise<void>;
//# sourceMappingURL=redis.d.ts.map