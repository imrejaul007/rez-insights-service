"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.createRedisClient = createRedisClient;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.getRedis = getRedis;
exports.getRedisClient = getRedis;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.cacheDelete = cacheDelete;
exports.cacheDeletePattern = cacheDeletePattern;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
let redisClient = null;
exports.redis = redisClient;
function createRedisClient() {
    const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS } = env_1.env;
    const config = {
        host: REDIS_HOST,
        port: parseInt(REDIS_PORT, 10),
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
    };
    if (REDIS_PASSWORD) {
        config.password = REDIS_PASSWORD;
    }
    if (REDIS_TLS === 'true' || REDIS_TLS === '1') {
        config.tls = true;
    }
    const client = new ioredis_1.default(config);
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
        exports.redis = redisClient = createRedisClient();
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
            exports.redis = redisClient = null;
            console.log('Redis disconnected successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown Redis disconnect error';
            console.error('Redis disconnect failed:', errorMessage);
            throw error;
        }
    }
}
function getRedis() {
    if (!redisClient) {
        exports.redis = redisClient = createRedisClient();
    }
    return redisClient;
}
// Cache utility functions
async function cacheGet(key) {
    const client = getRedis();
    const data = await client.get(key);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds = 3600) {
    const client = getRedis();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
}
async function cacheDel(key) {
    const client = getRedis();
    await client.del(key);
}
async function cacheDelete(key) {
    return cacheDel(key);
}
async function cacheDeletePattern(pattern) {
    const client = getRedis();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
        await client.del(...keys);
    }
}
//# sourceMappingURL=redis.js.map