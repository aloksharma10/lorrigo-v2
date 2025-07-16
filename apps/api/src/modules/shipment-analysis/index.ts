import { FastifyInstance } from 'fastify';
import { ShipmentAnalysisController } from './shipment-analysis.controller';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

export default async function shipmentAnalysisRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);
  const controller = new ShipmentAnalysisController(fastify);

  // Home page analytics - accessible by all authenticated users
  fastify.get(
    '/home',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.getHomePageAnalytics.bind(controller)
  );

  // Shipment performance analytics - accessible by all authenticated users
  fastify.get(
    '/performance',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.getShipmentPerformanceAnalytics.bind(controller)
  );

  // Real-time analytics - accessible by all authenticated users
  fastify.get(
    '/realtime',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.getRealTimeAnalytics.bind(controller)
  );

  // Predictive analytics - accessible by all authenticated users
  fastify.get(
    '/predictive',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.getPredictiveAnalytics.bind(controller)
  );

  // Generic analytics block endpoint - accessible by all authenticated users
  fastify.get<{ Params: { block: string } }>(
    '/block/:block',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.getAnalyticsBlock.bind(controller)
  );

  // Cache management - accessible by all authenticated users
  fastify.delete(
    '/cache',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.clearCache.bind(controller)
  );

  // Performance metrics - admin only
  fastify.get(
    '/metrics',
    { preHandler: [authorizeRoles([Role.ADMIN])] },
    controller.getPerformanceMetrics.bind(controller)
  );

  // Health check - accessible by all authenticated users
  fastify.get(
    '/health',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    controller.healthCheck.bind(controller)
  );

  // Additional specialized endpoints for specific analytics blocks

  // Courier performance analytics
  fastify.get(
    '/courier-performance',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const filters = request.query;
      const data = await controller.getShipmentPerformanceAnalytics(request, reply);
      return data;
    }
  );

  // Zone performance analytics
  fastify.get(
    '/zone-performance',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const filters = request.query;
      const data = await controller.getShipmentPerformanceAnalytics(request, reply);
      return data;
    }
  );

  // Delivery timeline analytics
  fastify.get(
    '/delivery-timeline',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const filters = request.query;
      const data = await controller.getShipmentPerformanceAnalytics(request, reply);
      return data;
    }
  );

  // Weight analysis analytics
  fastify.get(
    '/weight-analysis',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const filters = request.query;
      const data = await controller.getShipmentPerformanceAnalytics(request, reply);
      return data;
    }
  );

  // Channel analysis analytics
  fastify.get(
    '/channel-analysis',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const filters = request.query;
      const data = await controller.getShipmentPerformanceAnalytics(request, reply);
      return data;
    }
  );

  // Top issues analytics
  fastify.get(
    '/top-issues',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const filters = request.query;
      const data = await controller.getShipmentPerformanceAnalytics(request, reply);
      return data;
    }
  );

  // Action items analytics
  fastify.get(
    '/action-items',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getHomePageAnalytics(request, reply);
      return data;
    }
  );

  // Upcoming pickups analytics
  fastify.get(
    '/upcoming-pickups',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getHomePageAnalytics(request, reply);
      return data;
    }
  );

  // KYC status analytics
  fastify.get(
    '/kyc-status',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getHomePageAnalytics(request, reply);
      return data;
    }
  );

  // System alerts analytics
  fastify.get(
    '/system-alerts',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getRealTimeAnalytics(request, reply);
      return data;
    }
  );

  // Delivery predictions analytics
  fastify.get(
    '/delivery-predictions',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getPredictiveAnalytics(request, reply);
      return data;
    }
  );

  // RTO predictions analytics
  fastify.get(
    '/rto-predictions',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getPredictiveAnalytics(request, reply);
      return data;
    }
  );

  // Demand forecast analytics
  fastify.get(
    '/demand-forecast',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getPredictiveAnalytics(request, reply);
      return data;
    }
  );

  // Courier recommendations analytics
  fastify.get(
    '/courier-recommendations',
    { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] },
    async (request, reply) => {
      const userId = request.userPayload?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const data = await controller.getPredictiveAnalytics(request, reply);
      return data;
    }
  );
} 