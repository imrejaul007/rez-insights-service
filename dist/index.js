"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("./config/mongodb");
const redis_1 = require("./config/redis");
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const app = (0, express_1.default)();
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
        const redis = (0, redis_1.getRedis)();
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
        const redis = (0, redis_1.getRedis)();
        await redis.ping();
        res.status(200).json({ ready: true });
    }
    catch (error) {
        res.status(503).json({ ready: false, error: 'Service not ready' });
    }
});
app.get('/metrics', (_req, res) => {
    const metrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
    };
    res.json(metrics);
});
app.get('/', (_req, res) => {
    res.json({
        service: 'rez-insights-service',
        version: '1.0.0',
        endpoints: ['/health', '/ready', '/metrics'],
    });
});
app.use('/api/insights', insights_routes_1.default);
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});
// Graceful shutdown
async function shutdown() {
    console.log('Shutting down gracefully...');
    await (0, mongodb_1.disconnectMongoDB)();
    await (0, redis_1.disconnectRedis)();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Start server
const PORT = parseInt(process.env.PORT || '3011', 10);
async function start() {
    try {
        await (0, mongodb_1.connectMongoDB)();
        await (0, redis_1.connectRedis)();
        app.listen(PORT, () => {
            console.log(`Rez Insights Service running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
exports.default = app;
//# sourceMappingURL=index.js.map