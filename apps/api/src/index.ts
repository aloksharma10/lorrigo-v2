import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { prisma } from '@lorrigo/db';
import { APP_CONFIG } from './config/app';
import { registerSwagger } from './plugins/swagger';
import { registerRateLimiter } from './plugins/rate-limiter';
import authPlugin from './plugins/auth';
import { initSentry, captureException } from './lib/sentry';

// Route modules
import orderRoutes from './modules/orders';
import shipmentRoutes from './modules/shipments';
import authRoutes from './modules/auth';
import customerRoutes from './modules/customers';
import courierRoutes from './modules/couriers';

// Initialize Sentry
initSentry();

// Create Fastify server
const server = Fastify({
  logger: {
    level: APP_CONFIG.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Attach prisma client to fastify instance
server.decorate('prisma', prisma);

// Register plugins
const registerPlugins = async () => {
  try {
    // Security plugins
    await server.register(helmet);
    await server.register(cors, {
      origin: APP_CONFIG.CORS.ORIGIN,
      credentials: APP_CONFIG.CORS.CREDENTIALS,
    });

    // Authentication
    await server.register(authPlugin);

    // Rate limiter
    await registerRateLimiter(server);

    // API Documentation
    await registerSwagger(server);

    // Register API routes
    await server.register(
      async (fastify) => {
        // Register new modular routes
        fastify.register(orderRoutes, { prefix: '/orders' });
        fastify.register(shipmentRoutes, { prefix: '/shipments' });

        // Register existing routes until refactored
        fastify.register(authRoutes, { prefix: '/auth' });
        fastify.register(customerRoutes, { prefix: '/customers' });
        fastify.register(courierRoutes, { prefix: '/couriers' });

        // Health check route
        fastify.get('/health', async () => {
          return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: APP_CONFIG.API_VERSION,
            environment: APP_CONFIG.NODE_ENV,
          };
        });
      },
      { prefix: `${APP_CONFIG.API_PREFIX}/${APP_CONFIG.API_VERSION}` }
    );

    server.log.info('All plugins registered successfully');
  } catch (error) {
    server.log.error('Failed to register plugins');
    captureException(error as Error);
    process.exit(1);
  }
};

// Start the server
const start = async () => {
  try {
    await registerPlugins();

    await server.listen({
      port: APP_CONFIG.PORT,
      host: APP_CONFIG.HOST,
    });

    server.log.info(`Server running at http://${APP_CONFIG.HOST}:${APP_CONFIG.PORT}`);
  } catch (error) {
    server.log.error(error);
    captureException(error as Error);
    process.exit(1);
  }
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  captureException(error as Error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  captureException(error as Error);
  process.exit(1);
});

// Start server
start();
