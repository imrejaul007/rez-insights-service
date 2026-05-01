"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = createRedisClient;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.getRedisClient = getRedisClient;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDelete = cacheDelete;
exports.cacheDeletePattern = cacheDeletePattern;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
let redisClient = null;
function createRedisClient() {
    const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS } = env_1.env;
    const client = new ioredis_1.default({
        host: REDIS_HOST,
        port: parseInt(REDIS_PORT, 10),
        retryStrategy: (times) => {
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
async function connectRedis() {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    try {
        await redisClient.connect();
        return redisClient;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Redis connection error';
        console.error('Redis connection failed:', errorMessage);
        throw error;
    }
}
async function disconnectRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            redisClient = null;
            console.log('Redis disconnected');
        }
        catch (error) {
            console.error('Redis disconnect error:', error);
        }
    }
}
function getRedisClient() {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    return redisClient;
}
// Cache helper functions
async function cacheGet(key) {
    const client = getRedisClient();
    return client.get(key);
}
async function cacheSet(key, value, ttlSeconds) {
    const client = getRedisClient();
    if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
    }
    else {
        await client.set(key, value);
    }
}
async function cacheDelete(key) {
    const client = getRedisClient();
    await client.del(key);
}
async function cacheDeletePattern(pattern) {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
        await client.del(...keys);
    }
}
//# sourceMappingURL=redis.js.map