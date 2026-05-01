import express, { Request, Response, NextFunction } from 'express';
import { env } from './config/env';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb';
import { connectRedis, disconnectRedis, getRedisClient } from './config/redis';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import insightsRoutes from './routes/insights.routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${_res.statusCode} [${duration}ms]`);
  });
  next();
});

app.get('/health', async (_req: Request, res: Response) => {
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

    const redis = getRedisClient();
    const redisPing = await redis.ping();
    health.redisStatus = redisPing === 'PONG' ? 'connected' : 'error';
  } catch (error) {
    health.status = 'degraded';
    console.error('Health check error:', error);
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const mongoStatus = require('mongoose').connection.readyState;
    if (mongoStatus !== 1) {
      res.status(503).json({ ready: false, error: 'MongoDB not connected' });
      return;
    }

    const redis = getRedisClient();
    await redis.ping();

    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Service not ready' });
  }
});

app.use('/api/insights', optionalAuthMiddleware, rateLimiter, insightsRoutes);

app.post('/api/insights', authMiddleware, rateLimiter, insightsRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: env.isDevelopment ? err.message : 'An unexpected error occurred',
  });
});

interface ServerInstance {
  app: typeof app;
  shutdown: () => Promise<void>;
}

let serverInstance: ServerInstance | null = null;

async function startServer(): Promise<ServerInstance> {
  console.log('Starting Rez Insights Service...');

  try {
    console.log('Connecting to MongoDB...');
    await connectMongoDB();

    console.log('Connecting to Redis...');
    await connectRedis();

    const PORT = parseInt(env.PORT, 10);

    const server = app.listen(PORT, () => {
      console.log(`Rez Insights Service running on port ${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });

    server.on('error', (error: Error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    const shutdown = async () => {
      console.log('Shutting down gracefully...');

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await disconnectMongoDB();
          await disconnectRedis();
          console.log('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app, startServer };
export default app;
