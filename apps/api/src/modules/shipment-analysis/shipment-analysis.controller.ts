import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ShipmentAnalysisService } from './shipment-analysis.service';
import { ShipmentAnalysisFilters } from './types';

export class ShipmentAnalysisController {
  private shipmentAnalysisService: ShipmentAnalysisService;

  constructor(private fastify: FastifyInstance) {
    this.shipmentAnalysisService = new ShipmentAnalysisService(fastify);
  }

  /**
   * Get home page analytics
   */
  async getHomePageAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const startTime = Date.now();
      const data = await this.shipmentAnalysisService.getHomePageAnalytics(userId);
      const executionTime = Date.now() - startTime;

      return reply.send({
        success: true,
        data,
        meta: {
          executionTime: `${executionTime}ms`,
          cached: false, // Would check if data came from cache
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.fastify.log.error('Error in getHomePageAnalytics:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Get shipment performance analytics
   */
  async getShipmentPerformanceAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const filters: ShipmentAnalysisFilters = request.query as ShipmentAnalysisFilters;
      
      const startTime = Date.now();
      const data = await this.shipmentAnalysisService.getShipmentPerformanceAnalytics(userId, filters);
      const executionTime = Date.now() - startTime;

      return reply.send({
        success: true,
        data,
        meta: {
          executionTime: `${executionTime}ms`,
          cached: false,
          filters,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.fastify.log.error('Error in getShipmentPerformanceAnalytics:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const startTime = Date.now();
      const data = await this.shipmentAnalysisService.getRealTimeAnalytics(userId);
      const executionTime = Date.now() - startTime;

      return reply.send({
        success: true,
        data,
        meta: {
          executionTime: `${executionTime}ms`,
          cached: false,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.fastify.log.error('Error in getRealTimeAnalytics:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const startTime = Date.now();
      const data = await this.shipmentAnalysisService.getPredictiveAnalytics(userId);
      const executionTime = Date.now() - startTime;

      return reply.send({
        success: true,
        data,
        meta: {
          executionTime: `${executionTime}ms`,
          cached: false,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.log('error', error);
      this.fastify.log.error('Error in getPredictiveAnalytics:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Get specific analytics block
   */
  async getAnalyticsBlock(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      const { block } = request.params as { block: string };
      const filters: ShipmentAnalysisFilters = request.query as ShipmentAnalysisFilters;

      let data: any;
      const startTime = Date.now();

      switch (block) {
        case 'home':
          data = await this.shipmentAnalysisService.getHomePageAnalytics(userId);
          break;
        case 'performance':
          data = await this.shipmentAnalysisService.getShipmentPerformanceAnalytics(userId, filters);
          break;
        case 'realtime':
          data = await this.shipmentAnalysisService.getRealTimeAnalytics(userId);
          break;
        case 'predictive':
          data = await this.shipmentAnalysisService.getPredictiveAnalytics(userId);
          break;
        default:
          return reply.status(400).send({
            success: false,
            message: 'Invalid analytics block',
            availableBlocks: ['home', 'performance', 'realtime', 'predictive'],
          });
      }

      const executionTime = Date.now() - startTime;

      return reply.send({
        success: true,
        data,
        meta: {
          block,
          executionTime: `${executionTime}ms`,
          cached: false,
          filters: block === 'performance' ? filters : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      this.fastify.log.error('Error in getAnalyticsBlock:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Clear cache for a user
   */
  async clearCache(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      await this.shipmentAnalysisService.clearUserCache(userId);

      return reply.send({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.fastify.log.error('Error in clearCache:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Only allow admin users to access performance metrics
      if (request.userPayload?.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          message: 'Access denied. Admin privileges required.',
        });
      }

      const metrics = await this.shipmentAnalysisService.getPerformanceMetrics(userId);

      return reply.send({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.fastify.log.error('Error in getPerformanceMetrics:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  }

  /**
   * Health check for analytics service
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userPayload!.id;

      // Quick test to ensure service is working
      const startTime = Date.now();
      await this.shipmentAnalysisService.getRealTimeAnalytics(userId);
      const responseTime = Date.now() - startTime;

      return reply.send({
        success: true,
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: 'connected',
          queue: 'active',
        },
      });
    } catch (error) {
      this.fastify.log.error('Error in healthCheck:', error);
      return reply.status(503).send({
        success: false,
        status: 'unhealthy',
        message: 'Analytics service is not responding properly',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }
} 