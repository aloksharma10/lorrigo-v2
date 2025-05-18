import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { APP_CONFIG } from '../config/app';

export const registerSwagger = async (fastify: FastifyInstance) => {
  // Register Swagger
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Lorrigo Logistics API',
        description: 'API for logistics platform',
        version: '2.0.0',
      },
      servers: [
        {
          url: `http://localhost:${APP_CONFIG.PORT}${APP_CONFIG.API_PREFIX}/${APP_CONFIG.API_VERSION}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User endpoints' },
        { name: 'Customers', description: 'Customer endpoints' },
        { name: 'Orders', description: 'Order endpoints' },
        { name: 'Shipments', description: 'Shipment endpoints' },
        { name: 'Hubs', description: 'Hub endpoints' },
        { name: 'Wallets', description: 'Wallet endpoints' },
        { name: 'Couriers', description: 'Courier endpoints' },
        { name: 'Invoices', description: 'Invoice endpoints' },
        { name: 'Disputes', description: 'Dispute endpoints' },
        { name: 'Remittances', description: 'Remittance endpoints' },
        { name: 'BulkOperations', description: 'Bulk operations endpoints' },
        { name: 'Analytics', description: 'Analytics endpoints' },
      ],
    },
  });

  // Register Swagger UI
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  fastify.log.info('Swagger documentation available at /docs');
};
