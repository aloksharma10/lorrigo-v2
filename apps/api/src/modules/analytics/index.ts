import { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller';
import { authorizeRoles } from '@/middleware/auth';
import { Role } from '@lorrigo/db';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);
  const controller = new AnalyticsController(fastify);

  // Overview analytics endpoint
  fastify.get('/overview', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getOverviewAnalytics.bind(controller));

  // Orders analytics (all blocks)
  fastify.get('/orders', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getOrdersAnalytics.bind(controller));
  fastify.get('/orders/summary', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getOrdersAnalytics.bind(controller));

  // Revenue analytics
  fastify.get('/revenue', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getRevenueAnalytics?.bind(controller));

  // Shipments analytics
  fastify.get('/shipments', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getShipmentsAnalytics.bind(controller));

  // NDR analytics
  fastify.get('/ndr', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getNdrAnalytics.bind(controller));

  // RTO analytics
  fastify.get('/rto', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getRtoAnalytics.bind(controller));

  // Delivery performance analytics
  fastify.get('/delivery-performance', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getDeliveryPerformanceAnalytics?.bind(controller));

  // Courier split analytics
  fastify.get('/courier-split', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getCourierSplitAnalytics?.bind(controller));

  // Zone distribution analytics
  fastify.get('/zone-distribution', { preHandler: [authorizeRoles([Role.SELLER, Role.ADMIN])] }, controller.getZoneDistributionAnalytics?.bind(controller));

  // Add more endpoints as needed for each dashboard component
} 