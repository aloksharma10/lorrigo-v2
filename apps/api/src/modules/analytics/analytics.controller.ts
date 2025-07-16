import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor(private fastify: FastifyInstance) {
    this.analyticsService = new AnalyticsService(fastify);
  }

  async getOverviewAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userPayload?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
    const data = await this.analyticsService.getOverviewAnalytics(userId);
    return reply.send({ success: true, data });
  }

  async getOrdersAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userPayload?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
    const filters = request.query;
    const data = await this.analyticsService.getOrdersAnalytics(userId, filters);
    return reply.send({ success: true, data });
  }

  async getRevenueAnalytics(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ success: true, data: { message: 'Revenue analytics (to be implemented)' } });
  }

  async getShipmentsAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userPayload?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
    const filters = request.query;
    const data = await this.analyticsService.getShipmentsAnalytics(userId, filters);
    return reply.send({ success: true, data });
  }

  async getNdrAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userPayload?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
    const filters = request.query;
    const data = await this.analyticsService.getNdrAnalytics(userId, filters);
    return reply.send({ success: true, data });
  }

  async getRtoAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.userPayload?.id;
    if (!userId) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
    const filters = request.query;
    const data = await this.analyticsService.getRtoAnalytics(userId, filters);
    return reply.send({ success: true, data });
  }

  async getDeliveryPerformanceAnalytics(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ success: true, data: { message: 'Delivery performance analytics (to be implemented)' } });
  }

  async getCourierSplitAnalytics(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ success: true, data: { message: 'Courier split analytics (to be implemented)' } });
  }

  async getZoneDistributionAnalytics(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ success: true, data: { message: 'Zone distribution analytics (to be implemented)' } });
  }
} 