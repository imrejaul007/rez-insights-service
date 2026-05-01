"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
exports.createUserRateLimiter = createUserRateLimiter;
exports.createStrictRateLimiter = createStrictRateLimiter;
exports.createBulkRateLimiter = createBulkRateLimiter;
exports.ipRateLimiter = ipRateLimiter;
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const defaultConfig = {
    windowMs: parseInt(env_1.env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env_1.env.RATE_LIMIT_MAX_REQUESTS, 10),
    keyPrefix: 'ratelimit',
    skipFailedRequests: false,
};
async function getRateLimitInfo(key) {
    const client = (0, redis_1.getRedisClient)();
    const data = await client.get(key);
    if (!data) {
        return { count: 0, resetTime: 0 };
    }
    return JSON.parse(data);
}
async function setRateLimitInfo(key, info, ttlSeconds) {
    const client = (0, redis_1.getRedisClient)();
    await client.setex(key, ttlSeconds, JSON.stringify(info));
}
function generateKey(req, prefix) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = req.user?.userId || 'anonymous';
    return `${prefix}:${ip}:${userId}`;
}
function createRateLimiter(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    return async (req, res, next) => {
        if (finalConfig.skip?.(req)) {
            next();
            return;
        }
        const key = generateKey(req, finalConfig.keyPrefix || 'ratelimit');
        const now = Date.now();
        const windowStart = now - finalConfig.windowMs;
        try {
            const info = await getRateLimitInfo(key);
            if (info.resetTime > 0 && info.resetTime < now) {
                await setRateLimitInfo(key, { count: 0, resetTime: now + finalConfig.windowMs }, Math.ceil(finalConfig.windowMs / 1000));
                info.count = 0;
                info.resetTime = now + finalConfig.windowMs;
            }
            if (info.count >= finalConfig.maxRequests) {
                const retryAfter = Math.ceil((info.resetTime - now) / 1000);
                res.setHeader('X-RateLimit-Limit', String(finalConfig.maxRequests));
                res.setHeader('X-RateLimit-Remaining', '0');
                res.setHeader('X-RateLimit-Reset', String(Math.ceil(info.resetTime / 1000)));
                res.setHeader('Retry-After', String(retryAfter));
                res.status(429).json({
                    success: false,
                    error: 'Too many requests, please try again later',
                    retryAfter,
                });
                return;
            }
            const newCount = info.count + 1;
            const resetTime = info.resetTime > 0 ? info.resetTime : now + finalConfig.windowMs;
            await setRateLimitInfo(key, { count: newCount, resetTime }, Math.ceil(finalConfig.windowMs / 1000));
            res.setHeader('X-RateLimit-Limit', String(finalConfig.maxRequests));
            res.setHeader('X-RateLimit-Remaining', String(Math.max(0, finalConfig.maxRequests - newCount)));
            res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
            if (finalConfig.skipFailedRequests && res.statusCode >= 400) {
                const currentInfo = await getRateLimitInfo(key);
                await setRateLimitInfo(key, { count: currentInfo.count - 1, resetTime }, Math.ceil(finalConfig.windowMs / 1000));
            }
            next();
        }
        catch (error) {
            console.error('Rate limiter error:', error);
            next();
        }
    };
}
exports.rateLimiter = createRateLimiter();
function createUserRateLimiter(maxRequests = 20) {
    return createRateLimiter({
        maxRequests,
        keyPrefix: 'ratelimit:user',
        windowMs: 60000,
    });
}
function createStrictRateLimiter(maxRequests = 5) {
    return createRateLimiter({
        maxRequests,
        keyPrefix: 'ratelimit:strict',
        windowMs: 60000,
    });
}
function createBulkRateLimiter(maxRequests = 100) {
    return createRateLimiter({
        maxRequests,
        keyPrefix: 'ratelimit:bulk',
        windowMs: 60000,
    });
}
function ipRateLimiter() {
    return async (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `ratelimit:ip:${ip}`;
        const client = (0, redis_1.getRedisClient)();
        try {
            const count = await client.incr(key);
            if (count === 1) {
                await client.expire(key, 60);
            }
            const ttl = await client.ttl(key);
            res.setHeader('X-RateLimit-IP-Limit', '60');
            res.setHeader('X-RateLimit-IP-Remaining', String(Math.max(0, 60 - count)));
            res.setHeader('X-RateLimit-IP-Reset', String(Math.ceil((Date.now() + ttl * 1000) / 1000)));
            if (count > 60) {
                res.status(429).json({
                    success: false,
                    error: 'Too many requests from this IP, please try again later',
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('IP rate limiter error:', error);
            next();
        }
    };
}
//# sourceMappingURL=rateLimiter.js.map