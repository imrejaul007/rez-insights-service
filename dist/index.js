"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const mongodb_1 = require("./config/mongodb");
const redis_1 = require("./config/redis");
const auth_1 = require("./middleware/auth");
const rateLimiter_1 = require("./middleware/rateLimiter");
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${_res.statusCode} [${duration}ms]`);
    });
    next();
});
app.get('/health', async (_req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'rez-insights-service',
        version: '1.0.0',
    };
    try {
        const mongoStatus = require('mongoose').connection.readyState;
        health.mongoStatus = mongoStatus === 1 ? 'connected' : 'disconnected';
        const redis = (0, redis_1.getRedisClient)();
        const redisPing = await redis.ping();
        health.redisStatus = redisPing === 'PONG' ? 'connected' : 'error';
    }
    catch (error) {
        health.status = 'degraded';
        console.error('Health check error:', error);
    }
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});
app.get('/ready', async (_req, res) => {
    try {
        const mongoStatus = require('mongoose').connection.readyState;
        if (mongoStatus !== 1) {
            res.status(503).json({ ready: false, error: 'MongoDB not connected' });
            return;
        }
        const redis = (0, redis_1.getRedisClient)();
        await redis.ping();
        res.status(200).json({ ready: true });
    }
    catch (error) {
        res.status(503).json({ ready: false, error: 'Service not ready' });
    }
});
app.use('/api/insights', auth_1.optionalAuthMiddleware, rateLimiter_1.rateLimiter, insights_routes_1.default);
app.post('/api/insights', auth_1.authMiddleware, rateLimiter_1.rateLimiter, insights_routes_1.default);
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found',
    });
});
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: env_1.isDevelopment ? err.message : 'An unexpected error occurred',
    });
});
let serverInstance = null;
async function startServer() {
    console.log('Starting Rez Insights Service...');
    try {
        console.log('Connecting to MongoDB...');
        await (0, mongodb_1.connectMongoDB)();
        console.log('Connecting to Redis...');
        await (0, redis_1.connectRedis)();
        const PORT = parseInt(env_1.env.PORT, 10);
        const server = app.listen(PORT, () => {
            console.log(`Rez Insights Service running on port ${PORT}`);
            console.log(`Environment: ${env_1.env.NODE_ENV}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
        server.on('error', (error) => {
            console.error('Server error:', error);
            process.exit(1);
        });
        const shutdown = async () => {
            console.log('Shutting down gracefully...');
            server.close(async () => {
                console.log('HTTP server closed');
                try {
                    await (0, mongodb_1.disconnectMongoDB)();
                    await (0, redis_1.disconnectRedis)();
                    console.log('Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    console.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
            setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            shutdown();
        });
        serverInstance = { app, shutdown };
        return serverInstance;
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=index.js.map