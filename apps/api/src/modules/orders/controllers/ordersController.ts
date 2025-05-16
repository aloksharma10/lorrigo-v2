import { FastifyRequest, FastifyReply } from 'fastify';
import { captureException } from '../../../lib/sentry';
import { OrderService } from '../services/orderService';
import { 
  CreateOrderSchema,
  UpdateOrderSchema,
  OrderQuerySchema,
  OrderStatsQuerySchema
} from '../validations';
import { z } from 'zod';
import { addJob } from '../../../lib/queue';
import { QueueNames } from '../../../lib/queue';

/**
 * Order Controller handles HTTP request/response logic
 */
export class OrderController {
  private orderService: OrderService;
  
  constructor() {
    this.orderService = new OrderService();
  }
  
  /**
   * Get all orders with pagination and filters
   */
  async getAllOrders(request: FastifyRequest, reply: FastifyReply) {
    try {
      const queryParams = OrderQuerySchema.parse(request.query);
      const userId = request.user.id;
      
      const result = await this.orderService.getAllOrders(userId, queryParams);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      
      request.log.error(error);
      captureException(error as Error);
      
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
  
  /**
   * Get a specific order by ID
   */
  async getOrderById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      
      const order = await this.orderService.getOrderById(id, userId);
      
      if (!order) {
        return reply.code(404).send({
          message: 'Order not found',
        });
      }
      
      return order;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
  
  /**
   * Create a new order
   */
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = CreateOrderSchema.parse(request.body);
      const userId = request.user.id;
      
      const order = await this.orderService.createOrder(data, userId);
      
      // Add job to notification queue for order creation
      await addJob(
        QueueNames.NOTIFICATION,
        'order-created',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: userId,
          customerId: data.customerId,
        }
      );
      
      // Log API request
      await request.server.prisma.apiRequest.create({
        data: {
          endpoint: '/orders',
          method: 'POST',
          ipAddress: request.ip,
          userId: userId,
          userAgent: request.headers['user-agent'] as string,
          responseStatus: 201,
        },
      });
      
      return reply.code(201).send({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerId: order.customerId,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      
      request.log.error(error);
      captureException(error as Error);
      
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
  
  /**
   * Update an order status
   */
  async updateOrderStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updateData = UpdateOrderSchema.parse(request.body);
      const userId = request.user.id;
      
      const existingOrder = await this.orderService.getOrderById(id, userId);
      
      if (!existingOrder) {
        return reply.code(404).send({
          message: 'Order not found',
        });
      }
      
      const order = await this.orderService.updateOrderStatus(id, updateData);
      
      // Add job to notification queue for order status update
      if (updateData.status && updateData.status !== existingOrder.status) {
        await addJob(
          QueueNames.NOTIFICATION,
          'order-status-updated',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            previousStatus: existingOrder.status,
            newStatus: updateData.status,
            userId: userId,
            customerId: order.customerId,
          }
        );
      }
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      
      request.log.error(error);
      captureException(error as Error);
      
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const { reason } = request.body as { reason?: string };
      const userId = request.user.id;
      
      const result = await this.orderService.cancelOrder(id, userId, reason);
      
      if (result.error) {
        return reply.code(400).send({
          message: result.error,
        });
      }
      
      // Add job to notification queue for order cancellation
      await addJob(
        QueueNames.NOTIFICATION,
        'order-cancelled',
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          reason,
          userId: userId,
          customerId: result.order.customerId,
        }
      );
      
      return {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        updatedAt: result.order.updatedAt,
      };
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
  
  /**
   * Get order statistics
   */
  async getOrderStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { period = 'month' } = OrderStatsQuerySchema.parse(request.query);
      const userId = request.user.id;
      
      const stats = await this.orderService.getOrderStats(userId, period as string);
      
      return stats;
    } catch (error) {
      request.log.error(error);
      captureException(error as Error);
      
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }
} 